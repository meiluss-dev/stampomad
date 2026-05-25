export const countryNames: Record<string, string> = {
  AF:'Afghanistan',AL:'Albania',AQ:'Antarctica',DZ:'Algeria',AS:'American Samoa',AD:'Andorra',AO:'Angola',AG:'Antigua and Barbuda',AZ:'Azerbaijan',AR:'Argentina',AU:'Australia',AT:'Austria',BS:'Bahamas',BH:'Bahrain',BD:'Bangladesh',AM:'Armenia',BB:'Barbados',BE:'Belgium',BM:'Bermuda',BT:'Bhutan',BO:'Bolivia',BA:'Bosnia and Herzegovina',BW:'Botswana',BR:'Brazil',BZ:'Belize',IO:'British Indian Ocean Territory',SB:'Solomon Islands',VG:'British Virgin Islands',BN:'Brunei',BG:'Bulgaria',MM:'Myanmar',BI:'Burundi',BY:'Belarus',KH:'Cambodia',CM:'Cameroon',CA:'Canada',CV:'Cape Verde',KY:'Cayman Islands',CF:'Central African Republic',LK:'Sri Lanka',TD:'Chad',CL:'Chile',CN:'China',TW:'Taiwan',CO:'Colombia',KM:'Comoros',CG:'Republic of the Congo',CD:'DR Congo',CR:'Costa Rica',HR:'Croatia',CU:'Cuba',CY:'Cyprus',CZ:'Czech Republic',BJ:'Benin',DK:'Denmark',DM:'Dominica',DO:'Dominican Republic',EC:'Ecuador',SV:'El Salvador',GQ:'Equatorial Guinea',ET:'Ethiopia',ER:'Eritrea',EE:'Estonia',FO:'Faroe Islands',FK:'Falkland Islands',FJ:'Fiji',FI:'Finland',FR:'France',GF:'French Guiana',PF:'French Polynesia',DJ:'Djibouti',GA:'Gabon',GE:'Georgia',GM:'Gambia',PS:'Palestine',DE:'Germany',GH:'Ghana',KI:'Kiribati',GR:'Greece',GL:'Greenland',GD:'Grenada',GT:'Guatemala',GN:'Guinea',GY:'Guyana',HT:'Haiti',VA:'Vatican City',HN:'Honduras',HK:'Hong Kong',HU:'Hungary',IS:'Iceland',IN:'India',ID:'Indonesia',IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',CI:"Côte d'Ivoire",JM:'Jamaica',JP:'Japan',KZ:'Kazakhstan',JO:'Jordan',KE:'Kenya',KP:'North Korea',KR:'South Korea',KW:'Kuwait',KG:'Kyrgyzstan',LA:'Laos',LB:'Lebanon',LS:'Lesotho',LV:'Latvia',LR:'Liberia',LY:'Libya',LI:'Liechtenstein',LT:'Lithuania',LU:'Luxembourg',MO:'Macao',MG:'Madagascar',MW:'Malawi',MY:'Malaysia',MV:'Maldives',ML:'Mali',MT:'Malta',MR:'Mauritania',MU:'Mauritius',MX:'Mexico',MC:'Monaco',MN:'Mongolia',MD:'Moldova',ME:'Montenegro',MA:'Morocco',MZ:'Mozambique',OM:'Oman',NA:'Namibia',NR:'Nauru',NP:'Nepal',NL:'Netherlands',NC:'New Caledonia',VU:'Vanuatu',NZ:'New Zealand',NI:'Nicaragua',NE:'Niger',NG:'Nigeria',NO:'Norway',FM:'Micronesia',MH:'Marshall Islands',PW:'Palau',PK:'Pakistan',PA:'Panama',PG:'Papua New Guinea',PY:'Paraguay',PE:'Peru',PH:'Philippines',PL:'Poland',PT:'Portugal',GW:'Guinea-Bissau',TL:'Timor-Leste',PR:'Puerto Rico',QA:'Qatar',RO:'Romania',RU:'Russia',RW:'Rwanda',KN:'Saint Kitts and Nevis',LC:'Saint Lucia',VC:'Saint Vincent and the Grenadines',SM:'San Marino',ST:'São Tomé and Príncipe',SA:'Saudi Arabia',SN:'Senegal',RS:'Serbia',SC:'Seychelles',SL:'Sierra Leone',SK:'Slovakia',SI:'Slovenia',SO:'Somalia',ZA:'South Africa',ZW:'Zimbabwe',ES:'Spain',SS:'South Sudan',SD:'Sudan',SR:'Suriname',SZ:'Eswatini',SE:'Sweden',CH:'Switzerland',SY:'Syria',TJ:'Tajikistan',TH:'Thailand',TG:'Togo',TO:'Tonga',TT:'Trinidad and Tobago',AE:'UAE',TN:'Tunisia',TR:'Turkey',TM:'Turkmenistan',TV:'Tuvalu',UG:'Uganda',UA:'Ukraine',MK:'North Macedonia',EG:'Egypt',GB:'United Kingdom',TZ:'Tanzania',US:'United States',BF:'Burkina Faso',UY:'Uruguay',UZ:'Uzbekistan',VE:'Venezuela',WS:'Samoa',YE:'Yemen',ZM:'Zambia',XK:'Kosovo',VN:'Vietnam',SG:'Singapore',
};

export const numToAlpha: Record<number, string> = {
  4:'AF',8:'AL',10:'AQ',12:'DZ',16:'AS',20:'AD',24:'AO',28:'AG',31:'AZ',32:'AR',36:'AU',40:'AT',44:'BS',48:'BH',50:'BD',51:'AM',52:'BB',56:'BE',60:'BM',64:'BT',68:'BO',70:'BA',72:'BW',76:'BR',84:'BZ',86:'IO',90:'SB',92:'VG',96:'BN',100:'BG',104:'MM',108:'BI',112:'BY',116:'KH',120:'CM',124:'CA',132:'CV',136:'KY',140:'CF',144:'LK',148:'TD',152:'CL',156:'CN',158:'TW',170:'CO',174:'KM',178:'CG',180:'CD',188:'CR',191:'HR',192:'CU',196:'CY',203:'CZ',204:'BJ',208:'DK',212:'DM',214:'DO',218:'EC',222:'SV',226:'GQ',231:'ET',232:'ER',233:'EE',234:'FO',238:'FK',242:'FJ',246:'FI',250:'FR',254:'GF',258:'PF',262:'DJ',266:'GA',268:'GE',270:'GM',275:'PS',276:'DE',288:'GH',296:'KI',300:'GR',304:'GL',308:'GD',320:'GT',324:'GN',328:'GY',332:'HT',336:'VA',340:'HN',344:'HK',348:'HU',352:'IS',356:'IN',360:'ID',364:'IR',368:'IQ',372:'IE',376:'IL',380:'IT',384:'CI',388:'JM',392:'JP',398:'KZ',400:'JO',404:'KE',408:'KP',410:'KR',414:'KW',417:'KG',418:'LA',422:'LB',426:'LS',428:'LV',430:'LR',434:'LY',438:'LI',440:'LT',442:'LU',446:'MO',450:'MG',454:'MW',458:'MY',462:'MV',466:'ML',470:'MT',478:'MR',480:'MU',484:'MX',492:'MC',496:'MN',498:'MD',499:'ME',504:'MA',508:'MZ',512:'OM',516:'NA',520:'NR',524:'NP',528:'NL',540:'NC',548:'VU',554:'NZ',558:'NI',562:'NE',566:'NG',578:'NO',583:'FM',584:'MH',585:'PW',586:'PK',591:'PA',598:'PG',600:'PY',604:'PE',608:'PH',616:'PL',620:'PT',624:'GW',626:'TL',630:'PR',634:'QA',642:'RO',643:'RU',646:'RW',659:'KN',662:'LC',670:'VC',674:'SM',678:'ST',682:'SA',686:'SN',688:'RS',690:'SC',694:'SL',703:'SK',705:'SI',706:'SO',710:'ZA',716:'ZW',724:'ES',728:'SS',729:'SD',740:'SR',748:'SZ',752:'SE',756:'CH',760:'SY',762:'TJ',764:'TH',768:'TG',776:'TO',780:'TT',784:'AE',788:'TN',792:'TR',795:'TM',798:'TC',800:'UG',804:'UA',807:'MK',818:'EG',826:'GB',834:'TZ',840:'US',854:'BF',858:'UY',860:'UZ',862:'VE',882:'WS',887:'YE',894:'ZM',895:'XK',704:'VN',
};

export function getContinent(code: string): string {
  const e = new Set(['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA']);
  const a = new Set(['AF','AM','AZ','BH','BD','BT','BN','KH','CN','TW','GE','HK','IN','ID','IR','IQ','IL','JP','JO','KZ','KW','KG','LA','LB','MO','MY','MV','MN','MM','NP','KP','OM','PK','PS','PH','QA','SA','SG','LK','SY','TJ','TH','TL','TR','TM','AE','UZ','VN','YE']);
  const af = new Set(['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','SZ','TZ','TG','TN','UG','ZM','ZW']);
  const am = new Set(['AG','AR','BS','BB','BZ','BO','BR','CA','CL','CO','CR','CU','DM','DO','EC','SV','GD','GT','GY','HT','HN','JM','MX','NI','PA','PY','PE','PR','KN','LC','VC','SR','TT','US','UY','VE']);
  const oc = new Set(['AU','NZ','FJ','PG','SB','VU','WS','TO','KI','FM','MH','PW','NR','TV']);
  if (e.has(code)) return 'Europe';
  if (a.has(code)) return 'Asia';
  if (af.has(code)) return 'Africa';
  if (am.has(code)) return 'Americas';
  if (oc.has(code)) return 'Oceania';
  return 'Other';
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '\u{1F3F3}';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0))
  );
}

export function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d + 'T12:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CONT_TOTALS: Record<string, number> = { Europe: 44, Americas: 35, Asia: 48, Africa: 54, Oceania: 14 };
export const CONT_COLORS: Record<string, string> = { Europe: '#4ecdc4', Americas: '#c9a96e', Asia: '#e05c5c', Africa: '#52b788', Oceania: '#4a9eff' };

export function getCountryCenter(code: string): [number, number] {
  if (code?.includes('|')) code = code.split('|')[0];
  if (code) code = code.toUpperCase().trim();
  const centers: Record<string, [number, number]> = {
    US:[-95.7,37.1],CA:[-96.8,56.1],MX:[-102.5,23.6],GT:[-90.2,15.8],HN:[-86.6,14.8],
    SV:[-88.9,13.8],NI:[-85.2,12.9],CR:[-84.0,9.7],PA:[-80.0,8.5],CU:[-77.8,21.5],
    JM:[-77.3,18.1],HT:[-72.3,19.1],DO:[-70.2,19.0],TT:[-61.2,10.6],
    BR:[-51.9,-14.2],AR:[-63.6,-38.4],CL:[-71.5,-35.7],PE:[-75.0,-9.2],CO:[-74.3,4.1],
    VE:[-66.6,6.4],EC:[-78.1,-1.8],BO:[-64.7,-17.0],PY:[-58.4,-23.4],UY:[-55.8,-32.5],
    GB:[-3.4,55.4],IE:[-8.2,53.4],FR:[2.2,46.2],DE:[10.4,51.2],ES:[-3.7,40.4],
    PT:[-8.2,39.4],IT:[12.6,41.9],NL:[5.3,52.1],BE:[4.5,50.5],CH:[8.2,46.8],
    AT:[14.5,47.5],DK:[10.0,56.3],NO:[8.5,60.5],SE:[18.6,60.1],FI:[25.7,61.9],
    IS:[-19.0,64.9],PL:[19.1,51.9],CZ:[15.5,49.8],HU:[19.5,47.2],RO:[24.9,45.9],
    BG:[25.5,42.7],GR:[21.8,39.1],HR:[15.2,45.1],RS:[21.0,44.0],UA:[31.2,48.4],
    TR:[35.2,38.9],RU:[105.3,61.5],
    JP:[138.2,36.2],CN:[104.2,35.9],KR:[127.8,36.5],IN:[78.9,20.6],TH:[100.9,15.9],
    VN:[108.3,14.1],ID:[113.9,-0.8],PH:[122.9,12.9],MY:[109.7,4.2],SG:[103.8,1.4],
    AU:[133.8,-25.3],NZ:[172.5,-40.9],
    EG:[30.8,26.8],ZA:[22.9,-30.6],KE:[37.9,0.0],NG:[8.7,9.1],MA:[-7.1,31.8],
    SA:[45.1,23.9],AE:[53.8,23.4],IL:[35.0,31.5],
  };
  if (centers[code]) return centers[code];
  const cont = getContinent(code);
  const defaults: Record<string, [number, number]> = {
    Europe: [15, 52], Americas: [-80, 15], Asia: [90, 35], Africa: [20, 5], Oceania: [150, -25], Other: [0, 20]
  };
  return defaults[cont] || [0, 20];
}

export const tinyCountries = new Set([
  'SG','MT','LU','LI','AD','MC','SM','VA','BH','BN','MV','MU','SC','CV','KM',
  'BB','LC','VC','GD','AG','KN','DM','TT','MH','NR','TV','PW','FM','KI','TO','WS','VU','SB'
]);

export function getCountriesByContinent() {
  const continents = ['Europe', 'Americas', 'Asia', 'Africa', 'Oceania', 'Other'];
  const groups: Record<string, { code: string; name: string }[]> = {};
  continents.forEach(c => (groups[c] = []));
  Object.entries(countryNames).forEach(([code, name]) => {
    const cont = getContinent(code);
    if (groups[cont]) groups[cont].push({ code, name });
    else groups['Other'].push({ code, name });
  });
  continents.forEach(c => groups[c].sort((a, b) => a.name.localeCompare(b.name)));
  return { continents, groups };
}
