import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Asegúrate de que el canvas exista

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Asegúrate de que el contexto exista

    // Ajustar tamaño del canvas al tamaño del contenedor
    const handleResize = () => {
      // Calculamos el ancho disponible después del sidebar en pantallas medianas y grandes
      const isMobile = window.innerWidth < 768;
      // En móviles usa todo el ancho, en desktop resta el ancho del sidebar
      const availableWidth = isMobile ? window.innerWidth : window.innerWidth - 300;
      canvas.width = availableWidth;
      canvas.height = window.innerHeight;
    };
    
    handleResize(); // Establecer el tamaño inicial
    
    // Colores que combinan con la paleta existente
    const colors = ['#8998F1', '#7988E0', '#646cff', '#5468FF', '#F3F2FC'];
    
    // Configuración de partículas
    const particlesArray = [];
    const numberOfParticles = 50; // Aumenta para más densidad
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 15 + 5; // Partículas más grandes
        this.speedX = Math.random() * 1 - 0.5; // Movimiento más lento
        this.speedY = Math.random() * 1 - 0.5; // Movimiento más lento
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.7 + 0.3; // Mayor opacidad
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Reducir tamaño gradualmente
        if (this.size > 0.5) this.size -= 0.02;
        
        // Rebote en los bordes
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        
        // Revivir partículas que se hacen muy pequeñas
        if (this.size <= 0.5) {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.size = Math.random() * 15 + 5;
        }
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    function init() {
      particlesArray.length = 0; // Limpiar array
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    }
    
    function animate() {
      // Limpia el canvas con un fondo semi-transparente
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar partículas
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      
      // Dibujar líneas entre partículas cercanas
      connectParticles();
      
      requestAnimationFrame(animate);
    }
    
    function connectParticles() {
      const maxDistance = 150;
      
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(137, 152, 241, ${opacity * 0.6})`; // Líneas más visibles
            ctx.lineWidth = 1.5; // Líneas más gruesas
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }
    
    window.addEventListener('resize', handleResize);
    
    init();
    animate();
    
    // Limpieza
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 right-0 h-full pointer-events-none md:left-[280px] lg:left-[50px]"
      style={{
        zIndex: 0,
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        display: 'block', // Asegura que el canvas sea visible
        backgroundColor: 'transparent'
      }}
    />
  );
};

export default AnimatedBackground;