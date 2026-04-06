// Lista de socios autorizados
const listaSocios = [
  { email: "admin@dam.com", cedula: "123456" },
  { email: "miguel@dam.com", cedula: "109876" },
  { email: "socio1@dam.com", cedula: "2026" }
];

// Función para validar si existe el socio
function validarSocio(email, pass) {
  return listaSocios.find(user => user.email === email && user.cedula === pass);
}