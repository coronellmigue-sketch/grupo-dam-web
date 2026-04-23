// --- HERO CAROUSEL ---
const heroImages = [
  'https://www.latamairlines.com/content/dam/latamxp/sites/vamos-latam/news-caribe-dic-2024/aruba/Aruba-3.png',
  'https://fincaspanacah10.com/wp-content/uploads/slider/cache/8d9943bc57f6a322e73ec6f3ae287c60/VALLE-TOURIST-PAGE.jpg',
  'https://s28461.pcdn.co/wp-content/uploads/2024/08/%C2%A1Piscina-alberca-segura-y-divertida-para-toda-la-familia.jpg',
  'https://media.traveler.es/photos/61602c97709cbb2dfa86e2ef/4:3/w_1920,h_1440,c_limit/iStock-1165965255%20copia.jpg'
];

function startHeroCarousel() {
  const container = document.getElementById('hero-carousel');
  if (!container) return;

  let idx = 0;

  const img1 = document.createElement('img');
  const img2 = document.createElement('img');

  const baseClass = 'absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]';

  img1.className = baseClass + ' opacity-100';
  img2.className = baseClass + ' opacity-0';

  container.appendChild(img1);
  container.appendChild(img2);

  let current = img1;
  let next = img2;

  current.src = heroImages[idx];

  function showSlide(i) {
    next.src = heroImages[i];

    next.onload = () => {
      next.style.opacity = 1;
      current.style.opacity = 0;

      // swap referencias
      [current, next] = [next, current];
    };
  }

  setInterval(() => {
    idx = (idx + 1) % heroImages.length;
    showSlide(idx);
  }, 6000);
}

// --- NOVEDADES CAROUSEL ---
const novedades = [
  {
    url: "https://www.semana.com/resizer/v2/VAUHYGTB4VA6BHWL6YRRPOSMLE.png?auth=7fb949343debc0e13abac0e4389901952bc64def043270c509ef461dfd5e83d9&smart=true&quality=75&width=1280",
    titulo: "APOYA A LA SELE MUNDIAL 2026",
    desc: "Vive la pasión del fútbol mundial con experiencias exclusivas diseñadas para verdaderos aficionados."
  },
  {
    url: "https://www.peru.travel/Contenido/AcercaDePeru/Imagen/es/1/0.0/Principal/Machu%20Picchu.jpg",
    titulo: "MACHU PICCHU: EL DESPERTAR DE LOS INCAS",
    desc: "Conecta con la historia y la energía ancestral en uno de los destinos más imponentes del planeta."
  },
  {
    url: "https://imagescdn.citix.com.co/citix/production/media/media/2d26c56ef71462615cd77e974eacd7e5.jpg",
    titulo: "CAÑO CRISTALES: EL RÍO DE LOS 7 COLORES",
    desc: "Descubre una maravilla natural única donde la biodiversidad crea un espectáculo visual incomparable."
  },
  {
    url: "https://media.staticontent.com/media/pictures/8c0b05c1-6878-40bd-950c-989547bd5bf0",
    titulo: "PANAMÁ: DESTINO RECOMENDADO DEL MES",
    desc: "Lujo, cultura y modernidad en un solo lugar. El destino ideal para experiencias premium."
  }
];

function startNovedadesCarousel() {
  const container = document.getElementById('novedades-carousel');
  if (!container) return;

  let idx = 0;
  const slide = document.createElement('div');
  slide.className = 'relative w-full max-w-4xl mx-auto aspect-[16/10] md:aspect-[16/9] flex items-center justify-center overflow-hidden rounded-xl';
  container.appendChild(slide);

  function renderNovedad(i) {
    slide.innerHTML = `
      <img src="${novedades[i].url}" 
           class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0" 
           onload="this.style.opacity=1"/>
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative z-10 text-center px-6">
        <h2 class="text-white text-2xl md:text-4xl font-semibold mb-3">
          ${novedades[i].titulo}
        </h2>
        <p class="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
          ${novedades[i].desc}
        </p>
      </div>
    `;
  }

  renderNovedad(idx);
  setInterval(() => {
    idx = (idx + 1) % novedades.length;
    renderNovedad(idx);
  }, 3500);
}

// --- INICIALIZACIÓN Y LÓGICA DE INTERFAZ ---
window.addEventListener('DOMContentLoaded', () => {
  startHeroCarousel();
  startNovedadesCarousel();

  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLogin = document.getElementById('mobileLogin');
  const modal = document.getElementById('modal');
  const btnSocios = document.getElementById('btnSocios');
  const openLogin = document.getElementById('openLogin');
  const dropdown = document.getElementById('dropdown');

  // Lógica Menú Móvil
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      document.body.classList.toggle('overflow-hidden');
    });
  }

  // Lógica Modal
  const toggleModal = (show) => {
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      if(mobileMenu) mobileMenu.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    } else {
      modal.classList.add('hidden');
    }
  };

  if (mobileLogin) mobileLogin.onclick = () => toggleModal(true);
  if (btnSocios) btnSocios.onclick = () => toggleModal(true);
  if (openLogin) openLogin.onclick = () => toggleModal(true);

  if (modal) {
    modal.onclick = (e) => { if (e.target === modal) toggleModal(false); };
  }

  // Dropdown Desktop
  if (btnSocios && dropdown) {
    let timeout;
    const open = () => { clearTimeout(timeout); dropdown.classList.remove('hidden'); };
    const close = () => { timeout = setTimeout(() => dropdown.classList.add('hidden'), 300); };

    btnSocios.addEventListener('mouseenter', open);
    btnSocios.addEventListener('mouseleave', close);
    dropdown.addEventListener('mouseenter', open);
    dropdown.addEventListener('mouseleave', close);
  }

  // LOGIN VALIDATION
  document.body.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'loginBtn') {
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value.trim();

      if (typeof validarSocio === 'function') {
        const socioValido = validarSocio(email, pass);
        if (socioValido) {
          localStorage.setItem('sesionDAM', 'activa');
          window.location.href = 'landing.html';
        } else {
          alert('Tus credenciales no coinciden con nuestra base de datos.');
        }
      }
    }
  });
}); // <--- ESTE ES EL CIERRE QUE FALTABA