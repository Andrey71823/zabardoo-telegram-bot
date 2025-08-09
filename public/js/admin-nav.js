/*
 Navigation logic for admin unified dashboard.
 Externalized to work under stricter CSP and to simplify maintenance.
*/

(function initAdminNav() {
  'use strict';

  function setup() {
    // Disallow embedding in foreign iframes (defense-in-depth; CSP also covers this)
    try {
      if (window.top !== window.self) {
        document.body.innerHTML = '';
        return;
      }
    } catch (_) {}

    let currentUrl = '';
    let currentTitle = '';

    const sidebar = document.getElementById('sidebar');
    const contentFrame = document.getElementById('contentFrame');
    const titleEl = document.getElementById('contentTitle');
    const btnHome = document.getElementById('btnHome');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnOpenNew = document.getElementById('btnOpenNew');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarTitle = document.getElementById('sidebarTitle');

  function getIconClassFor(title) {
    const map = {
      'GPT Chat Management': 'fas fa-robot',
      'Favorites Management': 'fas fa-heart',
      'Telegram WebApp': 'fab fa-telegram',
      'Business Dashboard': 'fas fa-chart-line',
      'System Monitoring': 'fas fa-tachometer-alt',
      'Coupon Management': 'fas fa-ticket-alt',
      'User Management': 'fas fa-users',
      'Notification Campaigns': 'fas fa-bell',
      'Data Compliance': 'fas fa-shield-alt'
    };
    return map[title] || 'fas fa-cog';
  }

  function setActive(link) {
    document.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));
    if (link) link.classList.add('active');
  }

  function showLoading(title) {
    contentFrame.innerHTML = [
      '<div class="loading-state">',
      '  <div class="loading-spinner"></div>',
      `  <div>Loading ${title}...</div>`,
      '</div>'
    ].join('');
  }

  function loadContent(url, title, linkEl) {
    if (!url) return;
    if (linkEl) setActive(linkEl);

    titleEl.innerHTML = [`<i class="${getIconClassFor(title)}"></i>`, title].join(' ');
    showLoading(title);

    // Delay a bit for smoother UX
    setTimeout(() => {
      contentFrame.innerHTML = `<iframe class="content-iframe" src="${url}"></iframe>`;
      currentUrl = url;
      currentTitle = title;
    }, 200);

    if (window.innerWidth <= 768) sidebar.classList.remove('open');
  }

  function goToHome() {
    setActive(document.querySelector('.nav-link[data-action="home"]'));
    titleEl.innerHTML = '<i class="fas fa-home"></i> Welcome to Zabardoo Admin';
    contentFrame.innerHTML = '<iframe class="content-iframe" src="/dashboard.html"></iframe>';
    currentUrl = '';
    currentTitle = '';
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
  }

  function refreshContent() {
    const iframe = document.querySelector('.content-iframe');
    if (iframe) iframe.src = iframe.src;
  }

  function openInNewTab() {
    if (!currentUrl) return;
    window.open(currentUrl, '_blank');
  }

  function toggleSidebar() {
    sidebar.classList.toggle('open');
  }

    // Event bindings
    document.addEventListener('click', function handleOutsideClick(event) {
    if (window.innerWidth > 768) return;
    const menuBtn = mobileMenuBtn;
    if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
      sidebar.classList.remove('open');
    }
    });
    
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = link.getAttribute('data-action');
        if (action === 'home') return goToHome();
        const url = link.getAttribute('data-url');
        const title = link.getAttribute('data-title') || 'Section';
        loadContent(url, title, link);
      });
    });

    if (btnHome) btnHome.addEventListener('click', goToHome);
    if (btnRefresh) btnRefresh.addEventListener('click', refreshContent);
    if (btnOpenNew) btnOpenNew.addEventListener('click', openInNewTab);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (sidebarTitle) sidebarTitle.addEventListener('click', goToHome);

    // Initial state
    goToHome();

    // Expose minimal API for inline fallback (in case event listeners are blocked)
    window.ZAdmin = {
      loadContent,
      goToHome,
      toggleSidebar,
      refreshContent,
      openInNewTab
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();


