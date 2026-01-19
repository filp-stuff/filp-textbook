// Main JavaScript for the textbook

document.addEventListener('DOMContentLoaded', function() {
  // Scroll to top button
  initScrollToTop();

  // Smooth scroll for anchor links
  initSmoothScroll();

  // Add copy button to code blocks
  initCodeCopyButtons();

  // Animate elements on scroll
  initScrollAnimations();

  // Add progress indicator for lesson pages
  initReadingProgress();
});

// Scroll to top functionality
function initScrollToTop() {
  const scrollTopBtn = document.getElementById('scrollTop');
  if (!scrollTopBtn) return;

  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

// Copy button for code blocks
function initCodeCopyButtons() {
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach(function(codeBlock) {
    const pre = codeBlock.parentElement;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-button';
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Копировать</span>
    `;

    copyBtn.addEventListener('click', async function() {
      try {
        await navigator.clipboard.writeText(codeBlock.textContent);
        copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Скопировано!</span>
        `;
        copyBtn.classList.add('copied');

        setTimeout(function() {
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Копировать</span>
          `;
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    wrapper.appendChild(copyBtn);
  });
}

// Intersection Observer for scroll animations
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements that should animate
  document.querySelectorAll('.course-section, .lesson-card').forEach(function(el) {
    observer.observe(el);
  });
}

// Reading progress indicator for lesson pages
function initReadingProgress() {
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.innerHTML = '<div class="reading-progress-bar"></div>';
  document.body.appendChild(progressBar);

  const progressBarInner = progressBar.querySelector('.reading-progress-bar');

  window.addEventListener('scroll', function() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;

    progressBarInner.style.width = Math.min(progress, 100) + '%';
  });
}

// Add styles for dynamically created elements
const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
  .code-block-wrapper {
    position: relative;
  }

  .copy-button {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0;
  }

  .code-block-wrapper:hover .copy-button {
    opacity: 1;
  }

  .copy-button:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .copy-button.copied {
    background: rgba(16, 185, 129, 0.3);
    border-color: rgba(16, 185, 129, 0.5);
    color: #10b981;
  }

  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: rgba(99, 102, 241, 0.2);
    z-index: 1000;
  }

  .reading-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    width: 0;
    transition: width 0.1s ease;
  }

  .animate-in {
    animation: fadeInUp 0.5s ease-out forwards;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(dynamicStyles);
