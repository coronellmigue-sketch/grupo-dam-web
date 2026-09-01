function startNovedadesCarousel() {
  const stage = document.getElementById('novedades-banners-stage');
  const currentLayer = document.getElementById('novedades-current');
  const nextLayer = document.getElementById('novedades-next');

  if (!stage || !currentLayer || !nextLayer) return;

  const banners = ['banner-1.png', 'banner-2.png', 'banner-3.png'];
  const currentImg = currentLayer.querySelector('img');
  const nextImg = nextLayer.querySelector('img');

  if (!currentImg || !nextImg) return;

  let currentIndex = 0;
  let isAnimating = false;
  const visibleDelayMs = 3000;

  const setStageAspectFromImage = (img) => {
    const applyAspect = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      stage.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    };

    if (img.complete) {
      applyAspect();
    } else {
      img.addEventListener('load', applyAspect, { once: true });
    }
  };

  currentImg.src = banners[currentIndex];
  currentImg.alt = `Banner DAM ${currentIndex + 1}`;
  setStageAspectFromImage(currentImg);

  const runTransition = () => {
    if (isAnimating) return;
    isAnimating = true;

    const nextIndex = (currentIndex + 1) % banners.length;
    nextImg.src = banners[nextIndex];
    nextImg.alt = `Banner DAM ${nextIndex + 1}`;
    setStageAspectFromImage(nextImg);

    currentLayer.classList.remove('animate-out');
    void currentLayer.offsetWidth;
    currentLayer.classList.add('animate-out');

    const onAnimEnd = () => {
      currentLayer.classList.remove('animate-out');
      currentIndex = nextIndex;

      currentImg.src = banners[currentIndex];
      currentImg.alt = `Banner DAM ${currentIndex + 1}`;
      setStageAspectFromImage(currentImg);

      const upcomingIndex = (currentIndex + 1) % banners.length;
      nextImg.src = banners[upcomingIndex];
      nextImg.alt = `Banner DAM ${upcomingIndex + 1}`;

      isAnimating = false;

      // Espera 3 segundos completos con el banner ya visible antes de la siguiente salida.
      window.setTimeout(runTransition, visibleDelayMs);
    };

    currentLayer.addEventListener('animationend', onAnimEnd, { once: true });
  };

  nextImg.src = banners[(currentIndex + 1) % banners.length];
  nextImg.alt = 'Banner DAM 2';

  // Primer cambio: espera 3 segundos con el primer banner en pantalla.
  window.setTimeout(runTransition, visibleDelayMs);
}

// --- INICIALIZACIÓN Y LÓGICA DE INTERFAZ ---
window.addEventListener('DOMContentLoaded', () => {
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