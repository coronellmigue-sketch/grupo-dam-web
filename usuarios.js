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
  

];

// Función para validar si existe el socio
function validarSocio(email, pass) {
  return listaSocios.find(user => user.email === email && user.cedula === pass);
}