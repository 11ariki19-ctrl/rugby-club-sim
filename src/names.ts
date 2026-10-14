import { SURNAMES, GIVEN } from './data';

type NamePool = { surnames: readonly string[]; given: readonly string[] };
const INTERNATIONAL_POOLS: Record<string, NamePool> = {
  NZ: { surnames: ['Smith','Williams','Brown','Taylor','Wilson','Martin','Thompson','Anderson','Walker','Robinson','Clarke','Wright'], given: ['Liam','Noah','Oliver','Jack','Lucas','Mason','Leo','Charlie','Theo','Finn','Arlo','James','George','Ethan','Riley','Kai','Wiremu','Tama','Manaia','Hemi'] },
  SouthAfrica: { surnames: ['van der Merwe','du Plessis','Botha','Nkosi','Mokoena','Naidoo','Pretorius','Nel','Smith','Jacobs','Mthembu','Fourie'], given: ['Lukhanyo','Siya','Eben','Cheslin','Kurt-Lee','Jaden','Handré','Damian','Makazole','Siyamthanda','Thabo','Johan','Sibusiso','Pieter','Nkosi','Mandla'] },
  Australia: { surnames: ['Smith','Jones','Williams','Brown','Wilson','Taylor','Martin','Anderson','White','Thompson','Walker','Ryan'], given: ['Jack','Oliver','Charlie','Lachlan','Cooper','Noah','Thomas','William','James','Harry','Max','Liam','Angus','Riley','Jordan','Tane'] },
  England: { surnames: ['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans'], given: ['Harry','George','James','Arthur','Freddie','Theo','Charlie','Henry','Jack','Oliver','Finley','Thomas','Owen','Max','Tom','Ben'] },
  France: { surnames: ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Laurent','Simon'], given: ['Hugo','Louis','Gabriel','Jules','Antoine','Mathis','Théo','Arthur','Nathan','Lucas','Baptiste','Pierre','Maxime','Enzo','Romain','Paul'] },
  Ireland: { surnames: ["O'Brien","Murphy","Kelly","Byrne","Ryan","O'Sullivan","Walsh","McCarthy","Doyle","O'Connor","Fitzgerald","Gallagher"], given: ['Cian','Sean','Conor','Oisin','Ronan','Eoin','Jack','Caelan','Finn','James','Tadhg','Darragh','Patrick','Brian','Liam','Hugh'] },
  Scotland: { surnames: ['Campbell','Stewart','Robertson','Anderson','MacDonald','Scott','Murray','Taylor','Wilson','Thomson','Fraser','Graham'], given: ['Callum','Ewan','Finlay','Hamish','Jamie','Fraser','Angus','Alasdair','Rory','Gregor','Blair','Lachlan','Fergus','Cameron','Duncan','Iain'] },
  Wales: { surnames: ['Jones','Williams','Davies','Thomas','Evans','Roberts','Lewis','Hughes','Morgan','Griffiths','Price','Phillips'], given: ['Dylan','Rhys','Morgan','Evan','Owen','Gareth','Ioan','Tomos','Jac','Llyr','Carwyn','Gethin','Alun','Iwan','Gruffydd','Cai'] },
  Fiji: { surnames: ['Radradra','Tuisova','Nayacalevu','Botia','Yato','Nakarawa','Mata','Vunivalu','Nadolo','Waqaniburotu','Tawake','Drua'], given: ['Semi','Josua','Peni','Viliame','Manasa','Tevita','Waisea','Levani','Meli','Alivereti','Setareki','Eroni','Kalaveti','Jone','Apisalome','Mosese'] },
  Tonga: { surnames: ['Vunipola','Tupou','Taukafa','Fifita','Ma’afu','Latu','Moala','Havili','Naufahu','Kefu','Tuitavake','Vaea'], given: ['Sione','Viliami','Manu','Latu','Pita','Tupou','Samiuela','Taniela','Nasi','Kali','Siosaia','Feao','Salesi','Paea','Tevita','Isileli'] },
  Samoa: { surnames: ['Tuilagi','Leota','Lam','Faalogo','Tagi','Nuu','Vaega','Tupou','Ioane','Fia','Aiono','Sopoaga'], given: ['Tuala','Mika','Levi','Toa','Matai','Laki','Afa','Seilala','Alapati','Dwayne','Christian','Uce','Jonathan','Sione','Tupou','Mau'] },
  Argentina: { surnames: ['González','Rodríguez','Gómez','Fernández','López','Díaz','Martínez','Pérez','Sánchez','Romero','Torres','Álvarez'], given: ['Mateo','Santiago','Joaquín','Thiago','Lautaro','Tomás','Benjamín','Felipe','Juan','Nicolás','Agustín','Ignacio','Facundo','Marcos','Franco','Pablo'] },
  Italy: { surnames: ['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo'], given: ['Luca','Matteo','Leonardo','Alessandro','Marco','Lorenzo','Andrea','Francesco','Tommaso','Gabriele','Riccardo','Giovanni','Federico','Paolo','Davide','Enrico'] },
  Georgia: { surnames: ['Sharikadze','Niniashvili','Mamukashvili','Gorgadze','Lobzhanidze','Tskhadadze','Kveseladze','Abzhandadze','Jgenti','Mchedlidze','Todua','Gogichashvili'], given: ['Giorgi','Nika','Luka','Davit','Saba','Levan','Beka','Tornike','Gela','Vasil','Shalva','Akaki','Merab','Otar','Guram','Bidzina'] },
  USA: { surnames: ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Thomas','Jackson','White'], given: ['Jack','Logan','Wyatt','Carter','Owen','Ryan','Mason','Dylan','Luke','Caleb','Hunter','Ethan','Austin','Blake','Chase','Tyler'] },
  Canada: { surnames: ['Smith','Brown','Tremblay','Martin','Roy','Wilson','MacDonald','Gagnon','Johnson','Taylor','Côté','Campbell'], given: ['Liam','Benjamin','Ethan','Logan','Jacob','Noah','Lucas','Oliver','William','Thomas','Jack','Nathan','Olivier','Alexandre','Samuel','Gabriel'] },
  Portugal: { surnames: ['Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Jesus','Sousa','Fernandes','Gomes'], given: ['João','Francisco','Afonso','Duarte','Santiago','Tomás','Martim','Miguel','Pedro','Rafael','Tiago','Gonçalo','Diogo','André','Henrique','Guilherme'] },
  Uruguay: { surnames: ['Rodríguez','González','Pérez','Fernández','García','Silva','López','Martínez','Pereira','Sosa','Suárez','Castro'], given: ['Mateo','Santiago','Joaquín','Thiago','Lautaro','Tomás','Felipe','Juan','Nicolás','Agustín','Ignacio','Facundo','Marcos','Franco','Pablo','Bruno'] },
  Chile: { surnames: ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Rodríguez'], given: ['Mateo','Santiago','Joaquín','Benjamín','Vicente','Tomás','Lucas','Matías','Agustín','Maximiliano','Nicolás','Felipe','Cristóbal','Diego','Martín','Pablo'] },
  Spain: { surnames: ['García','Rodríguez','González','Fernández','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz'], given: ['Hugo','Martín','Lucas','Mateo','Leo','Daniel','Alejandro','Pablo','Manuel','Álvaro','Adrián','Mario','Diego','David','Javier','Sergio'] },
  Romania: { surnames: ['Popescu','Ionescu','Popa','Radu','Dumitru','Stoica','Stan','Gheorghe','Matei','Constantin','Marin','Florea'], given: ['Andrei','David','Alexandru','Gabriel','Ștefan','Mihai','Ionuț','Vlad','Cristian','Daniel','Adrian','Florin','George','Radu','Bogdan','Tudor'] },
};

const COUNTRY_ALIASES: Record<string, string> = {
  'ニュージーランド':'NZ', 'NZ':'NZ', 'New Zealand':'NZ',
  '南アフリカ':'SouthAfrica', 'South Africa':'SouthAfrica', 'SouthAfrica':'SouthAfrica',
  'オーストラリア':'Australia', 'Australia':'Australia',
  'イングランド':'England', 'England':'England',
  'フランス':'France', 'France':'France',
  'アイルランド':'Ireland', 'Ireland':'Ireland',
  'スコットランド':'Scotland', 'Scotland':'Scotland',
  'ウェールズ':'Wales', 'Wales':'Wales',
  'フィジー':'Fiji', 'Fiji':'Fiji',
  'トンガ':'Tonga', 'Tonga':'Tonga',
  'サモア':'Samoa', 'Samoa':'Samoa',
  'アルゼンチン':'Argentina', 'Argentina':'Argentina',
  'イタリア':'Italy', 'Italy':'Italy',
  'ジョージア':'Georgia', 'Georgia':'Georgia',
  'アメリカ':'USA', 'USA':'USA', 'United States':'USA',
  'カナダ':'Canada', 'Canada':'Canada',
  'ポルトガル':'Portugal', 'Portugal':'Portugal',
  'ウルグアイ':'Uruguay', 'Uruguay':'Uruguay',
  'チリ':'Chile', 'Chile':'Chile',
  'スペイン':'Spain', 'Spain':'Spain',
  'ルーマニア':'Romania', 'Romania':'Romania',
};
function choose<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
}

/** Create a unique random full name; overseas players use names from their nationality. */
export function generateUniquePlayerName(usedNames: Set<string>, country = '日本', random: () => number = Math.random): string {
  const code = COUNTRY_ALIASES[country] ?? country;
  const pool = INTERNATIONAL_POOLS[code];
  const surnames = pool?.surnames ?? SURNAMES;
  const givenNames = pool?.given ?? GIVEN;
  const normalize = (name: string) => name.normalize('NFKC').toLocaleLowerCase();
  for (let attempt = 0; attempt < 1200; attempt++) {
    const name = `${choose(surnames, random)} ${choose(givenNames, random)}`;
    const key = normalize(name);
    if (!usedNames.has(key) && !usedNames.has(name)) {
      usedNames.add(key);
      usedNames.add(name);
      return name;
    }
  }
  for (const surname of surnames) {
    for (const given of givenNames) {
      const name = `${surname} ${given}`;
      const key = normalize(name);
      if (!usedNames.has(key) && !usedNames.has(name)) {
        usedNames.add(key);
        usedNames.add(name);
        return name;
      }
    }
  }
  for (const surname of surnames) {
    for (const first of givenNames) {
      for (const second of givenNames) {
        const name = `${surname} ${first} ${second}`;
        const key = normalize(name);
        if (!usedNames.has(key) && !usedNames.has(name)) {
          usedNames.add(key);
          usedNames.add(name);
          return name;
        }
      }
    }
  }
  throw new Error(`一意な選手名を生成できませんでした: ${country}`);
}
