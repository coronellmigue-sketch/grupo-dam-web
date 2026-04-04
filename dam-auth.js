// dam-auth.js
// Centraliza la validación de socios DAM para todos los formularios de acceso

// Esta función busca en la lista de socios (puede ser ACCESO_SOCIOS_UNIVERSAL o SOCIOS_INICIALES)
function validarSocioDAM(correo, cedula) {
    // Busca la lista global, si existe
    let lista = [];
    if (typeof ACCESO_SOCIOS_UNIVERSAL !== 'undefined' && Array.isArray(ACCESO_SOCIOS_UNIVERSAL)) {
        lista = ACCESO_SOCIOS_UNIVERSAL;
    } else if (typeof SOCIOS_INICIALES !== 'undefined' && Array.isArray(SOCIOS_INICIALES)) {
        lista = SOCIOS_INICIALES;
    }
    correo = String(correo || '').trim().toLowerCase();
    cedula = String(cedula || '').trim();
    return lista.some(socio => {
        return (
            String(socio.correo || '').trim().toLowerCase() === correo &&
            String(socio.cedula || '').trim() === cedula
        );
    });
}

// Exporta para uso global
window.validarSocioDAM = validarSocioDAM;
