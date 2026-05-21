// Predefined Users
const users = [
  {
    name: 'Carlos',
    email: 'carlos@epn.edu.ec',
    password: 'carlos123'
  },
  {
    name: 'Francisco',
    email: 'francisco@epn.edu.ec',
    password: 'francisco123'
  },
  {
    name: 'Andrés',
    email: 'andres@epn.edu.ec',
    password: 'andres123'
  }
];

// Login Modal Functions
function showLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('show');
  document.body.style.overflow = 'auto';
  clearErrors();
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('login-modal');
  if (event.target === modal) {
    closeLoginModal();
  }
};

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeLoginModal();
  }
});

// Form Validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function clearErrors() {
  document.getElementById('email-error').textContent = '';
  document.getElementById('password-error').textContent = '';
}

function showError(elementId, message) {
  document.getElementById(elementId).textContent = message;
}

// Handle Login Form Submission
function handleLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  let isValid = true;

  // Validate email
  if (!email) {
    showError('email-error', 'El correo electrónico es requerido');
    isValid = false;
  } else if (!validateEmail(email)) {
    showError('email-error', 'Ingresa un correo electrónico válido');
    isValid = false;
  }

  // Validate password
  if (!password) {
    showError('password-error', 'La contraseña es requerida');
    isValid = false;
  } else if (!validatePassword(password)) {
    showError('password-error', 'La contraseña debe tener al menos 6 caracteres');
    isValid = false;
  }

  if (isValid) {
    // Verify credentials against predefined users
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      console.log('Login attempt:', { email, password });
      
      // Close login modal
      closeLoginModal();
      
      // Show galaxy loader
      showGalaxyLoader();

      // Simulate API call
      setTimeout(() => {
        // Store user session
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', user.name);
        
        // Hide galaxy loader
        hideGalaxyLoader();
        
        // Hide landing page and show game
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        console.log('Login successful! Welcome,', user.name);
      }, 2500);
    } else {
      showError('email-error', 'Credenciales inválidas');
      showError('password-error', 'Usuario o contraseña incorrectos');
    }
  }
}

// Galaxy Loader Functions
function showGalaxyLoader() {
  const loader = document.getElementById('galaxy-loader');
  loader.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function hideGalaxyLoader() {
  const loader = document.getElementById('galaxy-loader');
  loader.classList.remove('show');
  document.body.style.overflow = 'auto';
}

// Fill User Form
function fillUser(userName) {
  const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
  if (user) {
    document.getElementById('email').value = user.email;
    document.getElementById('password').value = user.password;
    clearErrors();
  }
}

// Check if user is already logged in
function checkAuth() {
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  
  // Add input validation on blur
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  emailInput.addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
      showError('email-error', 'Ingresa un correo electrónico válido');
    } else {
      document.getElementById('email-error').textContent = '';
    }
  });
  
  passwordInput.addEventListener('blur', function() {
    if (this.value && !validatePassword(this.value)) {
      showError('password-error', 'La contraseña debe tener al menos 6 caracteres');
    } else {
      document.getElementById('password-error').textContent = '';
    }
  });
  
  // Clear error on input
  emailInput.addEventListener('input', function() {
    document.getElementById('email-error').textContent = '';
  });
  
  passwordInput.addEventListener('input', function() {
    document.getElementById('password-error').textContent = '';
  });
});
