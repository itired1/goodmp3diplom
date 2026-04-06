class LandingAnimations {
  constructor() {
    this.canvas = document.getElementById('particle-field');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.particleCount = 80;
    this.mouse = { x: null, y: null, radius: 150 };
    this.rafId = null;
    
    this.init();
  }
  
  init() {
    if (this.canvas) {
      this.resizeCanvas();
      this.initParticles();
      this.initEventListeners();
    }
    this.initScrollReveal();
    this.initCursor();
    this.animate();
  }
  
  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }
  
  initParticles() {
    if (!this.canvas) return;
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }
  
  initEventListeners() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.initParticles();
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseout', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
  
  initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, [data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          if (entry.target.hasAttribute('data-reveal')) {
            entry.target.classList.add('is-visible');
          }
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    reveals.forEach(el => observer.observe(el));
  }
  
  initCursor() {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    
    if (!cursorDot && !cursorRing) return;
    
    let ringX = 0, ringY = 0;
    let dotX = 0, dotY = 0;
    
    document.addEventListener('mousemove', (e) => {
      dotX = e.clientX;
      dotY = e.clientY;
      
      if (cursorDot) {
        cursorDot.style.left = dotX + 'px';
        cursorDot.style.top = dotY + 'px';
      }
    });
    
    const animateCursor = () => {
      ringX += (dotX - ringX) * 0.15;
      ringY += (dotY - ringY) * 0.15;
      
      if (cursorRing) {
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
      }
      
      requestAnimationFrame(animateCursor);
    };
    animateCursor();
    
    const interactiveElements = document.querySelectorAll('a, button, .btn, .nav-ghost, .nav-solid, .button-solid, .button-ghost');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (cursorRing) cursorRing.classList.add('is-active');
        document.body.classList.add('cursor-enabled');
      });
      el.addEventListener('mouseleave', () => {
        if (cursorRing) cursorRing.classList.remove('is-active');
        document.body.classList.remove('cursor-enabled');
      });
    });
  }
  
  updateParticles() {
    if (!this.canvas) return;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      p.pulse += p.pulseSpeed;
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x += dx * force * 0.02;
          p.y += dy * force * 0.02;
        }
      }
    }
  }
  
  drawParticles() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const pulseOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(99, 102, 241, ${pulseOpacity})`;
      this.ctx.fill();
    }
    
    this.drawConnections();
  }
  
  drawConnections() {
    const connectionDistance = 120;
    
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < connectionDistance) {
          const opacity = (1 - dist / connectionDistance) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }
  
  animate() {
    this.updateParticles();
    this.drawParticles();
    this.rafId = requestAnimationFrame(() => this.animate());
  }
  
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

class MarqueeEffect {
  constructor() {
    this.items = document.querySelectorAll('.marquee-item');
    if (this.items.length === 0) return;
    
    this.items.forEach(item => {
      const clone = item.cloneNode(true);
      clone.classList.add('marquee-clone');
      item.parentNode.appendChild(clone);
    });
  }
}

class ParallaxHero {
  constructor() {
    this.hero = document.querySelector('.hero');
    this.heroContent = document.querySelector('.hero-content');
    if (!this.hero) return;
    
    this.init();
  }
  
  init() {
    window.addEventListener('scroll', () => this.update());
    this.update();
  }
  
  update() {
    const scrolled = window.pageYOffset;
    const heroHeight = this.hero.offsetHeight;
    const progress = Math.min(scrolled / heroHeight, 1);
    
    if (this.heroContent) {
      this.heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
      this.heroContent.style.opacity = 1 - progress * 1.5;
    }
    
    if (this.hero) {
      this.hero.style.setProperty('--scroll-progress', progress);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LandingAnimations();
  new MarqueeEffect();
  new ParallaxHero();
});

window.addEventListener('beforeunload', () => {
  if (window.landingAnimations) {
    window.landingAnimations.destroy();
  }
});
