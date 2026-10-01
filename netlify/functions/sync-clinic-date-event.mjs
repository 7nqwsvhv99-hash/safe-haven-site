const CD = 'app3AcoD2G64aMsEz';
const SH = 'app2vpch2JJVrP9pu';
const DAYS = 'tblnOw4Qr5AvCRWvQ';
const DATES = 'tblJvWn5fh7Rtfp3O';

const capacities = type => type === 'Half Day'
  ? {'Legacy Surgical Capacity':12,'Non-Surgical Capacity':5,'Base Public Surgical Capacity':5,'Max Capacity':21}
  : {'Legacy Surgical Capacity':21,'Non-Surgical Capacity':9,'Base Public Surgical Capacity':4,'Max Capacity':26};

async function airtable(base, table, method='GET', payload, query='') {
  const token = Netlify.env.get('AIRTABLE_ACCESS_TOKEN');
  if (!token) throw new Error('AIRTABLE_ACCESS_TOKEN is missing');
  const response = await fetch(`https://api.airtable.com/v0/${base}/${table}${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Airtable ${method} ${table}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function getStaffing(id) {
  const body = await airtable(SH, DATES, 'GET', undefined, '/' + encodeURIComponent(id));
  return body;
}

async function findClinicDay(date) {
  const params = new URLSearchParams();
  params.set('filterByFormula', `DATETIME_FORMAT({Clinic_Date},'YYYY-MM-DD')='${date}'`);
  params.set('pageSize','10');
  const body = await airtable(CD, DAYS, 'GET', undefined, '?' + params.toString());
  return body.records || [];
}

async function createClinicDay(date, type) {
  const body = await airtable(CD, DAYS, 'POST', {records:[{fields:{
    Clinic_Date:date,
    'Clinic Type':type,
    'Clinic Day Status':'Scheduled',
    ...capacities(type)
  }}]});
  return body.records[0];
}

async function patchStaffing(id, fields) {
  await airtable(SH, DATES, 'PATCH', {records:[{id,fields}]});
}

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', {status:405});
  if (Netlify.env.get('CLINIC_SCHEDULING_V2_ENABLED') !== 'true') {
    return Response.json({ok:true, skipped:'sync disabled'});
  }

  let payload;
  try { payload = await request.json(); } catch { return Response.json({ok:false,error:'Invalid JSON'}, {status:400}); }
  const staffingRecordId = String(payload?.staffingRecordId || '');
  if (!/^rec[A-Za-z0-9]{14}$/.test(staffingRecordId)) {
    return Response.json({ok:false,error:'Invalid staffing record ID'}, {status:400});
  }

  const row = await getStaffing(staffingRecordId);
  const f = row.fields || {};
  const date = String(f['Clinic Date'] || '').slice(0,10);
  const type = f['ClinicDay Session Type'] || 'Full Day';
  const stage = f['Scheduling Stage'] || '';
  const vets = Number(f['Confirmed Veterinarians'] || 0);
  const techs = Number(f['Confirmed Vet Techs'] || 0);

  if (!date || f['ClinicDay Record ID'] || ['Cancelled','Completed'].includes(stage) || vets < 1 || techs < 1) {
    return Response.json({ok:true, skipped:'not qualifying'});
  }

  const matches = await findClinicDay(date);
  if (matches.length > 1) throw new Error(`Multiple ClinicDay dates match ${date}`);
  let day = matches[0];
  if (day && (day.fields?.['Clinic Cancelled'] || day.fields?.['Clinic Day Status'] === 'Complete')) {
    await patchStaffing(staffingRecordId, {'Sync Review Notes':'Existing ClinicDay date is cancelled or complete. Coordinator must reconcile before reopening.'});
    return Response.json({ok:true, skipped:'existing date requires review'});
  }
  if (!day) day = await createClinicDay(date, type);

  await patchStaffing(staffingRecordId, {
    'ClinicDay Record ID':day.id,
    'Volunteer Target':6,
    'Last ClinicDay Sync':new Date().toISOString(),
    'Synced from ClinicDay':true,
    'Last Reviewed Schedule':JSON.stringify({date,type,sourceDate:date,sourceType:day.fields?.['Clinic Type'] || type,cancelled:false})
  });

  return Response.json({ok:true, clinicDayRecordId:day.id});
};

export const config = { path:'/api/internal/clinic-date-ready' };
