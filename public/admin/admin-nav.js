/* Local fallback copy of admin-nav to avoid path issues */
(function(){
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else {fn();} }
  ready(function(){
    var sidebar=document.getElementById('sidebar');
    var frameWrap=document.getElementById('contentFrame');
    var titleEl=document.getElementById('contentTitle');
    function setActive(a){document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active')); if(a)a.classList.add('active');}
    function goHome(){ setActive(document.querySelector('.nav-link[data-action="home"]')); titleEl.innerHTML='<i class="fas fa-home"></i> Welcome to Zabardoo Admin'; frameWrap.innerHTML='<iframe class="content-iframe" id="frame" name="frame" src="/dashboard.html"></iframe>'; }
    function load(url,title,a){ if(!url) return; setActive(a); titleEl.innerHTML='<i class="fas fa-cog"></i> '+title; frameWrap.innerHTML='<iframe class="content-iframe" id="frame" name="frame" src="'+url+'"></iframe>'; if (window.innerWidth<=768){ sidebar.classList.remove('open'); } }
    document.querySelectorAll('.nav-link').forEach(function(a){ a.addEventListener('click',function(e){ e.preventDefault(); var act=a.getAttribute('data-action'); if(act==='home'){ goHome(); return; } load(a.getAttribute('data-url'), a.getAttribute('data-title')||'Section', a); }); });
    var btn=document.getElementById('mobileMenuBtn'); if(btn){ btn.addEventListener('click', function(){ sidebar.classList.toggle('open'); }); }
    var btnHome=document.getElementById('btnHome'); if(btnHome){ btnHome.addEventListener('click', goHome); }
    var btnRefresh=document.getElementById('btnRefresh'); if(btnRefresh){ btnRefresh.addEventListener('click', function(){ var f=document.querySelector('.content-iframe'); if(f){ f.src=f.src; } }); }
    var btnOpen=document.getElementById('btnOpenNew'); if(btnOpen){ btnOpen.addEventListener('click', function(){ var f=document.querySelector('.content-iframe'); if(f){ window.open(f.src||'/dashboard.html','_blank'); } }); }
    goHome();
    window.ZAdmin={goHome:goHome};
  });
})();


