document.addEventListener('DOMContentLoaded', () => {

  // 1. Menú Navegación Hamburguesa
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Cerrar menú al presionar un enlace
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // 2. Acordeón Desplegable para Servicios
  const accordionBtns = document.querySelectorAll('.accordion-btn');

  accordionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      const isOpen = panel.style.maxHeight;

      // Cierra todos los demás acordeones para mantener orden
      document.querySelectorAll('.accordion-panel').forEach(p => p.style.maxHeight = null);

      if (!isOpen) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // 3. Modal de Cursos
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

  // Cerrar al hacer clic fuera del cuadro de diálogo
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

});
