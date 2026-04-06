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
  { email: "laurabarjas0902@gmail.com", cedula: "1005105828" },
  { email: "anita.reyesp@hotmail.com", cedula: "1098763245" },
  { email: "reyesmantilla0218@gmail.com", cedula: "1005210121" },
  { email: "reyesmantilla0218@gmail.com", cedula: "1005210121" },



  

];

// Función para validar si existe el socio
function validarSocio(email, pass) {
  return listaSocios.find(user => user.email === email && user.cedula === pass);
}