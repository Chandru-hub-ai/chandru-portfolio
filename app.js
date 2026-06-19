/**
 * CHANDRU // SYSTEM — Core Core Interface Engine
 * Compiled: 2026
 */

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initSmoothScroll();
  initTerminalForm();
  initScrollReveal();
});

/* ==========================================================================
   4. SCROLL REVEAL ENGINE — staggered entrance animations
   ========================================================================== */
function initScrollReveal() {
  // Hero column children — status badge, title, contact chip, sub-headline,
  // bio, CTA — fade/slide up in sequence on first paint.
  const heroItems = document.querySelectorAll('.hero-left > *');
  heroItems.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${i * 90}ms`;
  });

  // Hero portrait scales in slightly behind the text column.
  const heroRight = document.querySelector('.hero-right');
  if (heroRight) {
    heroRight.classList.add('reveal-scale');
    heroRight.style.transitionDelay = '220ms';
  }

  // Every dashboard module gets a reveal, staggered by its position in the
  // row (3-column grid) so cards appear in a left-to-right wave.
  const bentoBoxes = document.querySelectorAll('.bento-box');
  bentoBoxes.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 3) * 100}ms`;
  });

  // Certification cards inside the credentials grid — quick scale-stagger.
  const certNodes = document.querySelectorAll('.cert-node');
  certNodes.forEach((el, i) => {
    el.classList.add('reveal-scale');
    el.style.transitionDelay = `${(i % 5) * 80}ms`;
  });

  // Quantum Shield architecture spec tiles.
  const qNodes = document.querySelectorAll('.q-node');
  qNodes.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
  });

  const allRevealEls = document.querySelectorAll(
    '.reveal, .reveal-scale, .reveal-left, .reveal-right'
  );

  // Fallback for browsers without IntersectionObserver support: just show
  // everything immediately rather than leaving it invisible.
  if (!('IntersectionObserver' in window)) {
    allRevealEls.forEach((el) => el.classList.add('reveal-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  allRevealEls.forEach((el) => observer.observe(el));
}

function initTypewriter() {
  const targetElement = document.querySelector('.sub-headline');
  if (!targetElement) return;

  const phrases = [
    "Engineers AI Architecture",
    "Audits Cryptographic Primitives",
    "Deploys Multilingual Gen-AI",
    "Optimizes MLOps Pipelines",
    "Crafts Contextual Interfaces"
  ];

  let phraseIndex = 0;
  let characterIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function type() {
    const currentPhrase = phrases[phraseIndex];
    if (isDeleting) {
      targetElement.innerHTML = currentPhrase.substring(0, characterIndex - 1) + '<span class="blink">_</span>';
      characterIndex--;
      typingSpeed = 40;
    } else {
      targetElement.innerHTML = currentPhrase.substring(0, characterIndex + 1) + '<span class="blink">_</span>';
      characterIndex++;
      typingSpeed = 80;
    }

    if (!isDeleting && characterIndex === currentPhrase.length) {
      typingSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && characterIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 400;
    }
    setTimeout(type, typingSpeed);
  }
  type();
}

/* Framework Initialization Button & Nav Smooth Scroll Scroller */
function initSmoothScroll() {
  // 1. Fix the "Initialize Framework" button in the Hero section
  const actionButton = document.querySelector('.portal-btn');
  if (actionButton) {
    actionButton.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = document.querySelector('#projects');
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // 2. Optional: Force the top navigation link to scroll smoothly if it gets stuck
  const projectNavLink = document.querySelector('a[href="#projects"]');
  if (projectNavLink) {
    projectNavLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = document.querySelector('#projects');
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/* ==========================================================================
   3. CUSTOM TERMINAL FORM VALIDATION & POPUP MODALS
   ========================================================================== */
function initTerminalForm() {
  const form = document.getElementById('terminal-form');
  const modal = document.getElementById('system-modal');
  const modalText = document.getElementById('modal-text');
  const modalTitle = document.getElementById('modal-system-title');
  const modalClose = document.getElementById('modal-close');

  if (!form) return;

  // Function to display custom alert modal
  function showModal(titleText, bodyText, isError = false) {
    modalTitle.innerText = titleText;
    modalText.innerHTML = bodyText;
    
    if (isError) {
      modalTitle.style.color = '#ff5f56'; // Alert Red
    } else {
      modalTitle.style.color = 'var(--neon-cyan)'; // System Cyan
    }

    modal.classList.remove('hidden');
    modal.classList.add('visible');
  }

  // Dismiss Modal Event Handler
  modalClose.addEventListener('click', () => {
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 200); // Wait for fade-out animation
  });

  // Handle Form Submission Validation
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const message = document.getElementById('form-message').value.trim();

    // Structural Validation Checks
    if (name.length < 2) {
      showModal("VALIDATION_ERROR // NAME_FIELD", "Transmission rejected. Sender identity array is too short.", true);
      return;
    }

    if (message.length < 5) {
      showModal("VALIDATION_ERROR // DATA_PAYLOAD", "Transmission rejected. Payload payload field cannot be left blank.", true);
      return;
    }

    // Success Simulation Execution
    showModal(
      "TRANSMISSION_SUCCESS // LINK_ESTABLISHED", 
      `>> Handshake authenticated for <strong>${name}</strong>.<br>>> Message payload successfully buffered. Link status: OPTIMAL.`, 
      false
    );

    // Reset Form Input Parameters
    form.reset();
  });
}
// Add this inside your document.addEventListener('DOMContentLoaded', () => { ... }) loop:
initTopBanner();

// Paste this definition at the bottom of your file:
function initTopBanner() {
  const banner = document.getElementById('top-alert-banner');
  const closeBtn = document.getElementById('close-banner-btn');
  
  if (banner && closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.add('banner-hidden');
    });
  }
}
/* ==========================================================================
   NAVIGATION TOP BAR CONTACT MODAL POPUP TRIGGER
   ========================================================================== */
// 1. Grab all required DOM element blocks
const navContact = document.getElementById('nav-contact');
const systemModal = document.getElementById('system-modal');
const modalTitle = document.getElementById('modal-system-title');
const modalText = document.getElementById('modal-text');
const modalCloseBtn = document.getElementById('modal-close'); // Target close button

// 2. Setup click interceptor event listener
if (navContact) {
  navContact.addEventListener('click', (e) => {
    e.preventDefault(); // Intercept default jumping anchor click 
    
    // Inject clean text values dynamically into modal layout
    modalTitle.innerText = "CONTACT PORTAL";
    modalTitle.style.color = "#00f0ff"; 
    modalText.innerHTML = "To establish a secure link, please fill out the <strong>Message Portal</strong> form at the bottom of the page, or email me directly at <strong>lingamchandru53@gmail.com</strong>.";
    
    // Fire structural animations by swapping layout state utilities
    if (systemModal) {
      systemModal.classList.remove('hidden');
      systemModal.classList.add('visible');
    }
  });
}

// 3. Fix: Make sure clicking "Acknowledge & Dismiss" closes it down too!
if (modalCloseBtn && systemModal) {
  modalCloseBtn.addEventListener('click', () => {
    systemModal.classList.remove('visible');
    setTimeout(() => systemModal.classList.add('hidden'), 200);
  });
}
/* ==========================================================================
   HERO SUB-NAME CONTACT MODAL TRIGGER
   ========================================================================== */
const heroSubContact = document.getElementById('hero-sub-contact');

if (heroSubContact) {
  heroSubContact.addEventListener('click', (e) => {
    e.preventDefault(); // Prevents the page from reloading or jumping down
    
    // Customize your contact popup content window
    modalTitle.innerText = "SECURE PROTOCOL // CONTACT PORTAL";
    modalTitle.style.color = "#00f0ff"; // Signature Cyan accent glow
    
    modalText.innerHTML = "To establish a direct transmission link, please fill out the <strong>Message Portal</strong> form at the bottom of this terminal page, or email me directly at: <br><br><a href='mailto:lingamchandru53@gmail.com' style='color: #00f0ff; text-decoration: underline;'>lingamchandru53@gmail.com</a>";
    
    // Open the alert box smoothly
    if (systemModal) {
      systemModal.classList.remove('hidden');
      systemModal.classList.add('visible');
    }
  });
}