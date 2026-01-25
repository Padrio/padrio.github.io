// Spotlight Effect - Follows mouse cursor
document.addEventListener('DOMContentLoaded', () => {
  const updateSpotlight = (e) => {
    const x = e.clientX;
    const y = e.clientY;
    
    // Update CSS variables for body background
    document.documentElement.style.setProperty('--spotlight-x', `${x}px`);
    document.documentElement.style.setProperty('--spotlight-y', `${y}px`);
    
    // Update spotlight for all glass cards
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardX = e.clientX - rect.left;
      const cardY = e.clientY - rect.top;
      
      card.style.setProperty('--spotlight-x', `${cardX}px`);
      card.style.setProperty('--spotlight-y', `${cardY}px`);
    });
  };
  
  document.addEventListener('mousemove', updateSpotlight);
  
  // Initialize on page load
  if (window.innerWidth > 768) {
    updateSpotlight({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
  }
});
