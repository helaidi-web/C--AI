// ========================
// FORM VALIDATION FUNCTIONS
// ========================

// Validate email format
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength (min 6 characters)
function validatePassword(password) {
  return password.length >= 6;
}

// Validate that passwords match
function validatePasswordMatch(password, confirmPassword) {
  return password === confirmPassword;
}

// ========================
// FORM ELEMENTS REFERENCES
// ========================

// Login form elements
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginToggle = document.getElementById('loginToggle');
const loginFormWrapper = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Signup form elements
const signupForm = document.getElementById('signup-form');
const signupNameInput = document.getElementById('signupName');
const signupEmailInput = document.getElementById('signupEmail');
const signupPasswordInput = document.getElementById('signupPassword');
const signupConfirmPasswordInput = document.getElementById('signupConfirmPassword');
const signupToggle = document.getElementById('signupToggle');
const signupFormWrapper = document.getElementById('signupForm');
const signupError = document.getElementById('signupError');

// Common elements
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');

// ========================
// FORM TOGGLE FUNCTIONALITY
// ========================

// Switch to login form
loginToggle.addEventListener('click', () => {
  loginFormWrapper.classList.add('active');
  signupFormWrapper.classList.remove('active');
  loginToggle.classList.add('active');
  signupToggle.classList.remove('active');
  clearAllErrors();
});

// Switch to signup form
signupToggle.addEventListener('click', () => {
  signupFormWrapper.classList.add('active');
  loginFormWrapper.classList.remove('active');
  signupToggle.classList.add('active');
  loginToggle.classList.remove('active');
  clearAllErrors();
});

// ========================
// HELPER FUNCTIONS
// ========================

// Clear all error messages
function clearAllErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
  loginError.textContent = '';
  signupError.textContent = '';
  successMessage.classList.remove('show');
}

// Show loading state on button
function setButtonLoading(button, isLoading) {
  const btnText = button.querySelector('.btn-text');
  const spinner = button.querySelector('.loading-spinner');

  if (isLoading) {
    button.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';
  } else {
    button.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

// Show error message
function showError(errorElementId, message) {
  const element = document.getElementById(errorElementId);
  if (element) {
    element.textContent = message;
  }
}

// Show success message
function showSuccess(message) {
  successText.textContent = message;
  successMessage.classList.add('show');

  // Hide after 3 seconds
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);
}

// ========================
// LOGIN VALIDATION
// ========================

function validateLoginForm() {
  clearAllErrors();
  let isValid = true;

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  // Validate email
  if (!email) {
    showError('loginEmailError', 'Email is required');
    isValid = false;
  } else if (!validateEmail(email)) {
    showError('loginEmailError', 'Please enter a valid email');
    isValid = false;
  }

  // Validate password
  if (!password) {
    showError('loginPasswordError', 'Password is required');
    isValid = false;
  }

  return isValid;
}

// ========================
// SIGNUP VALIDATION
// ========================

function validateSignupForm() {
  clearAllErrors();
  let isValid = true;

  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmPasswordInput.value;
  const agreeTerms = document.getElementById('agreeTerms').checked;

  // Validate name
  if (!name) {
    showError('signupNameError', 'Full name is required');
    isValid = false;
  } else if (name.length < 2) {
    showError('signupNameError', 'Name must be at least 2 characters');
    isValid = false;
  }

  // Validate email
  if (!email) {
    showError('signupEmailError', 'Email is required');
    isValid = false;
  } else if (!validateEmail(email)) {
    showError('signupEmailError', 'Please enter a valid email');
    isValid = false;
  }

  // Validate password
  if (!password) {
    showError('signupPasswordError', 'Password is required');
    isValid = false;
  } else if (!validatePassword(password)) {
    showError('signupPasswordError', 'Password must be at least 6 characters');
    isValid = false;
  }

  // Validate confirm password
  if (!confirmPassword) {
    showError('signupConfirmPasswordError', 'Please confirm your password');
    isValid = false;
  } else if (!validatePasswordMatch(password, confirmPassword)) {
    showError('signupConfirmPasswordError', 'Passwords do not match');
    isValid = false;
  }

  // Check terms agreement
  if (!agreeTerms) {
    showError('signupConfirmPasswordError', 'You must agree to the terms');
    isValid = false;
  }

  return isValid;
}

// ========================
// LOGIN FUNCTIONALITY
// ========================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate form before submission
  if (!validateLoginForm()) {
    return;
  }

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  const button = loginForm.querySelector('button');

  try {
    // Show loading state
    setButtonLoading(button, true);
    loginError.textContent = '';

    // Firebase Authentication - Sign in with email and password
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Show success message
    showSuccess('Login successful! Redirecting...');

    // Redirect to home page after 1 second
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);

  } catch (error) {
    // Handle specific Firebase errors
    setButtonLoading(button, false);

    if (error.code === 'auth/user-not-found') {
      loginError.textContent = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      loginError.textContent = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      loginError.textContent = 'Invalid email format';
    } else if (error.code === 'auth/too-many-requests') {
      loginError.textContent = 'Too many failed login attempts. Try again later.';
    } else {
      loginError.textContent = error.message || 'Login failed. Please try again.';
    }
  }
});

// ========================
// SIGNUP FUNCTIONALITY
// ========================

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate form before submission
  if (!validateSignupForm()) {
    return;
  }

  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const button = signupForm.querySelector('button');

  try {
    // Show loading state
    setButtonLoading(button, true);
    signupError.textContent = '';

    // Firebase Authentication - Create user account
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save user information to Firestore database
    await firebaseDb.collection('users').doc(user.uid).set({
      name: name,
      email: email,
      createdAt: new Date(),
      lastLogin: new Date(),
      verified: false
    });

    // Show success message
    showSuccess('Account created successfully! Redirecting...');

    // Clear form
    signupForm.reset();

    // Redirect to home page after 1 second
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);

  } catch (error) {
    // Handle specific Firebase errors
    setButtonLoading(button, false);

    if (error.code === 'auth/email-already-in-use') {
      signupError.textContent = 'This email is already registered';
    } else if (error.code === 'auth/weak-password') {
      signupError.textContent = 'Password is too weak. Use a stronger password.';
    } else if (error.code === 'auth/invalid-email') {
      signupError.textContent = 'Invalid email format';
    } else if (error.code === 'auth/operation-not-allowed') {
      signupError.textContent = 'Account creation is disabled. Please try again later.';
    } else {
      signupError.textContent = error.message || 'Signup failed. Please try again.';
    }
  }
});

// ========================
// CHECK IF USER IS ALREADY LOGGED IN
// ========================

// Listen for authentication state changes
firebaseAuth.onAuthStateChanged((user) => {
  if (user) {
    // User is logged in - update last login time
    firebaseDb.collection('users').doc(user.uid).update({
      lastLogin: new Date()
    }).catch(err => console.log('Could not update last login:', err));
  }
});
