document.addEventListener('DOMContentLoaded', () => {

  // 1. Menú Móvil Hamburguesa
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 2. Pestañas de Pstore (Tabs sin precios)
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // 3. Controladores para Carruseles (Servicios y Cursos)
  const setupCarousel = (trackId, prevBtnId, nextBtnId) => {
    const track = document.getElementById(trackId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    if (track && prevBtn && nextBtn) {
      nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: 300, behavior: 'smooth' });
      });

      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -300, behavior: 'smooth' });
      });
    }
  };

  setupCarousel('servTrack', 'servPrev', 'servNext');
  setupCarousel('courseTrack', 'coursePrev', 'courseNext');

  // 4. Modal de Cursos
  const modal = document.getElementById('courseModal');
  const modalCourseTitle = document.getElementById('modalCourseTitle');
  const modalClose = document.getElementById('modalClose');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const openModalBtns = document.querySelectorAll('.open-modal-btn');

  const closeModal = () => {
    if (modal) modal.classList.remove('active');
  };

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const courseName = btn.getAttribute('data-course');
      if (modalCourseTitle) modalCourseTitle.textContent = courseName;
      if (modal) modal.classList.add('active');
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

});
