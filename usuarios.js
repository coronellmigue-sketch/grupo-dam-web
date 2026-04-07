// Lista de socios autorizados
const listaSocios = [
  { email: "admin@dam.com", cedula: "123456" },
  { email: "miguel@dam.com", cedula: "109876" },
  { email: "socio1@dam.com", cedula: "2026" },
  { email: "kayucade99@gmail.com", cedula: "1102391031" },
  { email: "jjoseluisvargas@gmail.com", cedula: "1093760094" },
  { email: "samuelsimi951@gmail.com", cedula: "0750496663" },
  { email: "melissafornaris10@hotmail.com", cedula: "1047381196" },
  { email: "milcajines@gmail.com", cedula: "1726236878" },
  { email: "dany-97@hotmail.com", cedula: "1065011442" },
  { email: "andres_caballero@hotmail.es", cedula: "1096211319" },
  { email: "jhoancamilogalvis466@gmail.com", cedula: "1090520805" },
  { email: "FTF.GESTIONSOCIAL@GMAIL.COM", cedula: "1098699467" },
  { email: "veeduria.dptal@gmail.com", cedula: "91214798" },
  { email: "laurabarajas0902@gmail.com", cedula: "1005105828" },
  { email: "anita.reyesp@hotmail.com", cedula: "1098763245" },
  { email: "reyesmantilla0218@gmail.com", cedula: "1005210121" },
  { email: "reyesmantilla0218@gmail.com", cedula: "1005210121" },
  { email: "kimivar123@gmail.com", cedula: "1193576178" },
  { email: "tathansilva1201@gmail.com", cedula: "1005053267" },
  { email: "jjoseluisvargas@gmail.com", cedula: "1093760094" },
  { email: "aeperozo1592@gmail.com", cedula: "1082955895" },
  { email: "mariacamilacano1101@gmail.com", cedula: "1001237740" },
  { email: "Cristianechavarria0222@hotmail.com", cedula: "1056784320" },
  { email: "Dany16-97@hotmail.com", cedula: "1065011442" },
  { email: "melissafornaris2@gmail.com", cedula: "1047381196" },
  { email: "Darlystrujillo@hotmail.com", cedula: "1023938142" },
  { email: "manueltrujillocardona@gmail.com", cedula: "1042773041" },
  { email: "Samuelsimi951@gmail.com", cedula: "0750496663" },
  { email: "milcajines@gmail.com", cedula: "1726236878" },
  { email: "marybellramirez7@gmail.com", cedula: "1045753359" },
  { email: "yerlismarin21@gmail.com", cedula: "1052985128" },



  

];

// Función para validar si existe el socio
function validarSocio(email, pass) {
  return listaSocios.find(user => user.email === email && user.cedula === pass);
}