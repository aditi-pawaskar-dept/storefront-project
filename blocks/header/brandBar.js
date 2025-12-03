const STORAGE_KEY = 'selected_brand';

let currentBrands = [];

// Get selected brand from localStorage or default to first brand
function getSelectedBrand() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  // Get first brand name
  if (currentBrands.length > 0) {
    return typeof currentBrands[0] === 'string' ? currentBrands[0] : currentBrands[0].name;
  }
  return 'RWB';
}

// Save selected brand to localStorage
function setSelectedBrand(brandName) {
  localStorage.setItem(STORAGE_KEY, brandName);
}

// Update the header brand display
function updateHeaderBrand(brandName) {
  const navBrand = document.querySelector('.nav-brand a');
  if (navBrand) {
    navBrand.textContent = brandName;
  }
}

// Update active state in brand bar
function updateBrandBarActiveState(selectedBrand) {
  const brandItems = document.querySelectorAll('.brand-bar-item');
  brandItems.forEach((item) => {
    if (item.textContent === selectedBrand) {
      item.classList.add('active');
      item.classList.remove('disabled');
    } else {
      item.classList.remove('active');
      item.classList.add('disabled');
    }
  });
}

// Handle brand selection and navigation
function handleBrandClick(brandName, brandUrl, event) {
  event.preventDefault();
  setSelectedBrand(brandName);
  updateHeaderBrand(brandName);
  // Navigate to brand page
  window.location.href = brandUrl;
}

export function createBrandBar(authoredBrands = null) {
  // Use authored brands from da.live
  currentBrands = authoredBrands && authoredBrands.length > 0 ? authoredBrands : [];

  const brandBar = document.createElement('div');
  brandBar.className = 'brand-bar';

  const brandContainer = document.createElement('div');
  brandContainer.className = 'brand-bar-container';

  const selectedBrand = getSelectedBrand();

  currentBrands.forEach((brand) => {
    const brandName = typeof brand === 'string' ? brand : brand.name;
    const brandUrl = typeof brand === 'string' 
      ? (brand.toUpperCase() === 'RWB' ? '/' : `/${brand.toLowerCase()}`)
      : brand.url +  "/";

    const brandItem = document.createElement('a');
    brandItem.className = 'brand-bar-item';
    brandItem.textContent = brandName;
    brandItem.href = brandUrl;

    // Set initial active/disabled state
    if (brandName === selectedBrand) {
      brandItem.classList.add('active');
    } else {
      brandItem.classList.add('disabled');
    }

    // Add click handler
    brandItem.addEventListener('click', (e) => {
      handleBrandClick(brandName, brandUrl, e);
    });

    brandContainer.appendChild(brandItem);
  });

  brandBar.appendChild(brandContainer);
  return brandBar;
}

// Initialize brand display on page load
export function initializeBrandDisplay() {
  const selectedBrand = getSelectedBrand();
  updateHeaderBrand(selectedBrand);
}