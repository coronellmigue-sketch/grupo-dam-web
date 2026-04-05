// HERO CAROUSEL
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

  const imgEl = document.createElement('img');
  imgEl.className = 'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0';

  container.appendChild(imgEl);

  function showSlide(i) {
    imgEl.style.opacity = 0;

    setTimeout(() => {
      imgEl.src = heroImages[i];
      imgEl.onload = () => {
        imgEl.style.opacity = 1;
      };
    }, 200);
  }

  showSlide(idx);

  setInterval(() => {
    idx = (idx + 1) % heroImages.length;
    showSlide(idx);
  }, 3000);
}

window.addEventListener('DOMContentLoaded', startHeroCarousel);



// NOVEDADES CAROUSEL
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
  slide.className = 'relative w-full max-w-5xl mx-auto aspect-video flex items-end justify-center overflow-hidden rounded-xl';

  container.appendChild(slide);

  function renderNovedad(i) {
    slide.innerHTML = `
      <img src="${novedades[i].url}" 
           class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0" 
           onload="this.style.opacity=1"/>

      <div class="absolute inset-0 bg-black/40"></div>

      <div class="relative z-10 text-center px-6 pb-10">
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

window.addEventListener('DOMContentLoaded', startNovedadesCarousel);



// DROPDOWN
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnSocios');
  const dropdown = document.getElementById('dropdown');

  if (!btn || !dropdown) return;

  btn.addEventListener('mouseenter', () => dropdown.classList.remove('hidden'));
  btn.addEventListener('mouseleave', () => setTimeout(() => dropdown.classList.add('hidden'), 300));

  dropdown.addEventListener('mouseenter', () => dropdown.classList.remove('hidden'));
  dropdown.addEventListener('mouseleave', () => dropdown.classList.add('hidden'));
});



// MODAL LOGIN
window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const btn = document.getElementById('btnSocios');
  const openLogin = document.getElementById('openLogin');

  if (!modal || !btn || !openLogin) return;

  btn.onclick = () => modal.classList.remove('hidden');
  openLogin.onclick = () => modal.classList.remove('hidden');

  modal.onclick = e => {
    if (e.target === modal) modal.classList.add('hidden');
  };
});



// LOGIN VALIDATION
window.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'loginBtn') {
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value.trim();

      if (email === 'admin@dam.com' && pass === '123456') {
        window.location.href = 'landing.html';
      } else {
        alert('Credenciales incorrectas');
      }
    }
  });
});