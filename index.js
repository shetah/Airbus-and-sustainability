/**
 * Airbus Sustainability Report - Interactive JavaScript
 * Gestisce navigazione smooth scroll, navbar dinamica e interazioni utente
 * Ottimizzato per performance e accessibilità
 */

'use strict';

// ========== UTILITY FUNCTIONS ==========

/**
 * Throttle function per limitare la frequenza di chiamate
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Millisecondi di attesa
 * @returns {Function} Funzione throttled
 */
function throttle(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Debounce function per ritardare l'esecuzione
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Millisecondi di ritardo
 * @returns {Function} Funzione debounced
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Smooth scroll verso un elemento specifico
 * @param {string} targetId - ID dell'elemento di destinazione
 * @param {Object} options - Opzioni di scrolling
 * @returns {boolean} Success/failure
 */
function scrollToElement(targetId, options = {}) {
  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  };
  
  const scrollOptions = { ...defaultOptions, ...options };
  const section = document.getElementById(targetId);
  
  if (section) {
    section.scrollIntoView(scrollOptions);
    
    // Aggiorna l'URL senza ricaricare la pagina
    if (history.pushState) {
      const newUrl = `${window.location.pathname}${window.location.search}#${targetId}`;
      history.pushState(null, '', newUrl);
    }
    
    // Focus per accessibilità
    section.focus({ preventScroll: true });
    
    return true;
  }
  
  console.warn(`[Airbus Site] Element with ID '${targetId}' not found`);
  return false;
}

/**
 * Verifica se un elemento è visibile nel viewport
 * @param {Element} element - Elemento da verificare
 * @param {number} threshold - Soglia di visibilità (0-1)
 * @returns {boolean} True se visibile
 */
function isElementVisible(element, threshold = 0.5) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  
  return (
    rect.top <= windowHeight * (1 - threshold) &&
    rect.bottom >= windowHeight * threshold
  );
}

// ========== NAVBAR MANAGEMENT ==========

/**
 * Gestisce il cambio di stile della navbar durante lo scroll
 */
function handleNavbarScroll() {
  const nav = document.querySelector('nav');
  const scrollThreshold = 80;
  
  if (nav) {
    const isScrolled = window.scrollY > scrollThreshold;
    nav.classList.toggle('scrolled', isScrolled);
    
    // Aggiorna attributo ARIA per screen reader
    nav.setAttribute('aria-label', 
      isScrolled ? 
      'Menu di navigazione principale (sfondo visibile)' : 
      'Menu di navigazione principale (trasparente)'
    );
  }
}

/**
 * Evidenzia il link attivo nella navbar
 */
function updateActiveNavLink() {
  const sections = ['homepage', 'performance', 'report'];
  const navLinks = document.querySelectorAll('nav a.smooth-scroll');
  let activeSection = '';
  
  // Trova la sezione attualmente visibile
  for (const sectionId of sections) {
    const section = document.getElementById(sectionId);
    if (section && isElementVisible(section, 0.3)) {
      activeSection = sectionId;
      break;
    }
  }
  
  // Aggiorna classe active sui link
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const isActive = href === `#${activeSection}`;
    
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ========== EVENT HANDLERS ==========

/**
 * Gestisce tutti gli eventi di click con event delegation
 * @param {Event} e - Event object
 */
function handleDocumentClick(e) {
  // Trova il target più specifico
  const button = e.target.closest('#goToReport');
  const smoothLink = e.target.closest('a.smooth-scroll');
  const downloadLink = e.target.closest('a[download]');
  
  // Bottone principale "Scarica il Report"
  if (button) {
    e.preventDefault();
    
    if (scrollToElement('report')) {
      // Analytics tracking (placeholder per futuri analytics)
      trackEvent('button_click', 'go_to_report', 'homepage');
    }
    
    return;
  }
  
  // Link con smooth scroll
  if (smoothLink) {
    e.preventDefault();
    
    const href = smoothLink.getAttribute('href');
    if (validateHref(href)) {
      const targetId = href.substring(1);
      if (scrollToElement(targetId)) {
        trackEvent('navigation', 'smooth_scroll', targetId);
      }
    } else {
      console.warn('[Airbus Site] Invalid href format for smooth scroll:', href);
    }
    
    return;
  }
  
  // Link di download
  if (downloadLink) {
    const filename = downloadLink.getAttribute('download') || 'document';
    trackEvent('download', 'report_pdf', filename);
    
    // Mostra feedback visivo
    showDownloadFeedback(downloadLink);
  }
}

/**
 * Gestisce la navigazione da tastiera per accessibilità
 * @param {KeyboardEvent} e - Evento tastiera
 */
function handleKeyboardNavigation(e) {
  const { key, ctrlKey, altKey } = e;
  
  // Enter o Space su elementi con tabindex personalizzato
  if ((key === 'Enter' || key === ' ') && 
      e.target.matches('[tabindex]:not(button):not(a):not(input)')) {
    e.preventDefault();
    e.target.click();
    return;
  }
  
  // Scorciatoie tastiera (Ctrl + numero per navigazione rapida)
  if (ctrlKey && !altKey) {
    const shortcuts = {
      '1': 'homepage',
      '2': 'performance', 
      '3': 'report'
    };
    
    if (shortcuts[key]) {
      e.preventDefault();
      scrollToElement(shortcuts[key]);
      trackEvent('keyboard_navigation', 'shortcut', shortcuts[key]);
    }
  }
  
  // Esc per tornare all'inizio
  if (key === 'Escape') {
    scrollToElement('homepage');
    trackEvent('keyboard_navigation', 'escape_to_top');
  }
}

/**
 * Gestisce il resize della finestra
 */
function handleWindowResize() {
  // Forza ricalcolo dell'altezza viewport per mobile
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Re-verifica sezione attiva dopo resize
  updateActiveNavLink();
}

// ========== VALIDATION & UTILITIES ==========

/**
 * Valida il formato di un href per smooth scroll
 * @param {string} href - L'href da validare
 * @returns {boolean} True se valido
 */
function validateHref(href) {
  return href && 
         typeof href === 'string' && 
         href.startsWith('#') && 
         href.length > 1 &&
         /^#[a-zA-Z][\w-]*$/.test(href);
}

/**
 * Mostra feedback visivo per download
 * @param {Element} element - Elemento che ha triggerato il download
 */
function showDownloadFeedback(element) {
  const originalText = element.textContent;
  const button = element.querySelector('button');
  
  if (button) {
    button.textContent = '⬇ Download avviato...';
    button.disabled = true;
    
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
}

/**
 * Placeholder per tracking analytics
 * @param {string} action - Azione eseguita
 * @param {string} category - Categoria evento
 * @param {string} label - Label aggiuntiva
 */
function trackEvent(action, category, label = '') {
  // Implementare qui l'integrazione con Google Analytics, Adobe Analytics, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
  
  // Debug logging
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    console.log(`[Analytics] ${action} | ${category} | ${label}`);
  }
}

// ========== INITIALIZATION ==========

/**
 * Resetta la posizione di scroll
 */
function resetScrollPosition() {
  // Previene il ripristino automatico dello scroll position
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  
  // Scroll immediato all'inizio
  window.scrollTo(0, 0);
  
  // Forza scroll dopo un breve delay per browser più lenti
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 100);
}

/**
 * Verifica la presenza di elementi critici
 */
function validateCriticalElements() {
  const criticalElements = [
    { selector: '#homepage', name: 'Homepage section' },
    { selector: '#performance', name: 'Performance section' },
    { selector: '#report', name: 'Report section' },
    { selector: 'nav', name: 'Navigation bar' }
  ];
  
  const missing = criticalElements.filter(
    ({ selector }) => !document.querySelector(selector)
  );
  
  if (missing.length > 0) {
    console.warn('[Airbus Site] Missing critical elements:', 
      missing.map(el => el.name).join(', ')
    );
  }
  
  return missing.length === 0;
}

/**
 * Imposta attributi ARIA dinamici
 */
function setupAccessibility() {
  // Imposta landmark roles se mancanti
  const main = document.querySelector('main');
  if (main && !main.getAttribute('role')) {
    main.setAttribute('role', 'main');
  }
  
  // Imposta descrizioni per sezioni
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    if (!section.getAttribute('aria-labelledby') && !section.getAttribute('aria-label')) {
      const heading = section.querySelector('h2, h3, h4');
      if (heading) {
        const headingId = heading.id || `section-heading-${index}`;
        heading.id = headingId;
        section.setAttribute('aria-labelledby', headingId);
      }
    }
  });
  

}

/**
 * Inizializza tutte le funzionalità del sito
 */
function initializeSite() {
  console.log('[Airbus Site] Initializing...');
  
  // Validazione elementi critici
  if (!validateCriticalElements()) {
    console.error('[Airbus Site] Critical elements missing, some features may not work');
  }
  
  // Setup accessibilità
  setupAccessibility();
  
  // Setup CSS custom properties per mobile viewport
  handleWindowResize();
  
  // Event listeners principali
  window.addEventListener('scroll', throttle(handleNavbarScroll, 16)); // ~60fps
  window.addEventListener('scroll', throttle(updateActiveNavLink, 100)); // Meno frequente
  window.addEventListener('resize', debounce(handleWindowResize, 250));
  
  // Event delegation
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Gestione navigazione browser
  window.addEventListener('beforeunload', resetScrollPosition);
  window.addEventListener('popstate', (e) => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      setTimeout(() => scrollToElement(hash.substring(1)), 100);
    }
  });
  
  // Inizializzazione stato iniziale
  handleNavbarScroll();
  updateActiveNavLink();
  
  // Gestione hash nell'URL al caricamento
  if (window.location.hash) {
    setTimeout(() => {
      scrollToElement(window.location.hash.substring(1));
    }, 300);
  }
  
  console.log('[Airbus Site] Initialization complete');
}

// ========== STARTUP ==========

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSite);
} else {
  // DOM già pronto
  initializeSite();
}

// Reset scroll position al caricamento
resetScrollPosition();

// Esporta funzioni per debugging (solo in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.AirbusDebug = {
    scrollToElement,
    handleNavbarScroll,
    updateActiveNavLink,
    validateCriticalElements
  };
}