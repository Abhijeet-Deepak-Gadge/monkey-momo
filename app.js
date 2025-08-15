let restaurants = [];

// Fetch restaurant data from Google Sheet via Apps Script
async function fetchRestaurants() {
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbyVVGLeXTHBYpHBnkrebfU5uvzFW5vsZ0RNs6lUxvtBSt4mXME_9r7Qrf7F7p2h5LNM/exec");
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            restaurants = data;
            loadRestaurants();
        } else {
            console.error("No restaurant data found.");
            document.getElementById('restaurantGrid').innerHTML = `<p class="text-center text-red-500">No restaurants available.</p>`;
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('restaurantGrid').innerHTML = `<p class="text-center text-red-500">Failed to load restaurants.</p>`;
    }
}

// Load restaurants into grid
function loadRestaurants(filteredRestaurants = restaurants) {
    const grid = document.getElementById('restaurantGrid');
    grid.innerHTML = '';

    filteredRestaurants.forEach(restaurant => {
        const restaurantCard = `
            <div class="restaurant-card rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div class="relative">
                    <img src="${restaurant.image}" alt="${restaurant.name}" class="w-full h-48 object-cover">
                    <div class="absolute top-4 right-4 bg-white px-3 py-1 rounded-full">
                        <span class="text-sm font-semibold text-gray-800">${restaurant.rating} ⭐</span>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold mb-2">${restaurant.name}</h3>
                    <p class="text-gray-600 mb-4">${restaurant.cuisine} • ${restaurant.deliveryTime}</p>
                    <button onclick="showRestaurantMenu(${restaurant.id})" 
                            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
                        View Menu
                    </button>
                </div>
            </div>
        `;
        grid.innerHTML += restaurantCard;
    });
}

// Filter by category
let activeCategory = null;
function filterByCategory(category) {
    activeCategory = category;
    const filtered = restaurants.filter(r => 
        r.cuisine.toLowerCase().includes(category.toLowerCase()) || 
        (r.tags && r.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase())))
    );
    loadRestaurants(filtered);
}

// Filter by rating
let activeRating = 0;
function filterByRating(rating) {
    activeRating = rating;
    let filtered = restaurants.filter(r => r.rating >= rating);
    if (activeCategory) {
        filtered = filtered.filter(r => 
            r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) || 
            (r.tags && r.tags.some(tag => tag.toLowerCase().includes(activeCategory.toLowerCase())))
        );
    }
    loadRestaurants(filtered);

    // Scroll to restaurants section smoothly
    document.getElementById('restaurants').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Highlight active category
function highlightActiveCategory() {
    const categoryButtons = document.querySelectorAll(".flex.overflow-x-auto button");
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("ring-2", "ring-blue-500"));
            btn.classList.add("ring-2", "ring-blue-500");
        });
    });
}
highlightActiveCategory();

// Show menu modal
function showRestaurantMenu(restaurantId) {
    const restaurant = restaurants.find(r => r.id == restaurantId);
    const modal = document.getElementById('foodModal');
    const modalContent = document.getElementById('modalContent');

    if (!restaurant) return;

    let menuHTML = `
        <div class="p-6">
            <div class="flex items-center mb-6">
                <img src="${restaurant.image}" alt="${restaurant.name}" class="w-16 h-16 rounded-full object-cover mr-4">
                <div>
                    <h2 class="text-2xl font-bold">${restaurant.name}</h2>
                    <p class="text-gray-600">${restaurant.cuisine} • ${restaurant.rating} ⭐ • ${restaurant.deliveryTime}</p>
                </div>
            </div>
            <h3 class="text-xl font-bold mb-4">Menu Items</h3>
            <div class="grid grid-cols-1 gap-4">
    `;

    (restaurant.foods || []).forEach(food => {
        const isOutOfStock = !food.stock; // true if stock is false
        menuHTML += `
            <div class="food-card border rounded-lg p-4 flex items-center justify-between relative overflow-hidden">
                <div class="flex items-center flex-1 relative">
                    <div class="relative">
                        <img src="${food.image}" alt="${food.name}" class="w-24 h-24 rounded-lg object-cover mr-4">
                        ${isOutOfStock ? `
                            <div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-lg">
                                <span class="text-white font-bold text-sm">Out of Stock</span>
                            </div>
                        ` : ""}
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold">${food.name}</h4>
                        <p class="text-gray-600 text-sm mb-2">${food.description}</p>
                        <p class="text-blue-600 font-bold">₹${food.price}</p>
                    </div>
                </div>

                ${
                    isOutOfStock 
                    ? `<span class="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">Unavailable</span>` 
                    : `<button onclick="orderFood('${restaurant.whatsappNumber}', '${food.name}', ${food.price})" 
                            class="whatsapp-btn text-white px-6 py-2 rounded-lg ml-4">
                            <i class="fab fa-whatsapp mr-2"></i>Order
                       </button>`
                }
            </div>
        `;
    });

    menuHTML += `</div></div>`;
    modalContent.innerHTML = menuHTML;
    modal.classList.remove('hidden');
}

// WhatsApp order
function orderFood(whatsappNumber, foodName, price) {
    const userLocation = localStorage.getItem('userLocation') || '';
    const message = encodeURIComponent(
        `🍽️ *New Order*\n\n` +
        `Item: ${foodName}\n` +
        `Price: ₹${price}\n` +
        `Delivery Address: ${userLocation}\n\n` +
        `Payment Method: [UPI/Card/Cash]\n\n` +
        `Additional Notes: [Any instructions]\n\n` +
        `Please confirm my order!`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}

// Close modal
function closeFoodModal() {
    document.getElementById('foodModal').classList.add('hidden');
}

// Search
function triggerSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    let filteredRestaurants = restaurants.filter(restaurant => {
        const matchName = restaurant.name.toLowerCase().includes(searchTerm);
        const matchCuisine = restaurant.cuisine.toLowerCase().includes(searchTerm);
        const matchFoods = (restaurant.foods || []).some(food => 
            food.name.toLowerCase().includes(searchTerm) || 
            food.description.toLowerCase().includes(searchTerm)
        );
        return matchName || matchCuisine || matchFoods;
    });
    if (activeCategory) {
        filteredRestaurants = filteredRestaurants.filter(r => 
            r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) || 
            (r.tags && r.tags.some(tag => tag.toLowerCase().includes(activeCategory.toLowerCase())))
        );
    }
    if (activeRating) {
        filteredRestaurants = filteredRestaurants.filter(r => r.rating >= activeRating);
    }
    loadRestaurants(filteredRestaurants);
}
document.getElementById('searchInput').addEventListener('input', triggerSearch);

// Get location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    .then(res => res.json())
                    .then(data => localStorage.setItem('userLocation', data.display_name))
                    .catch(console.error);
            },
            err => console.error('Location error:', err)
        );
    }
}
getUserLocation();

// Deep link
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('restaurant');
    if (restaurantId) {
        showRestaurantMenu(parseInt(restaurantId));
    }
}

// Init
window.addEventListener('load', () => {
    fetchRestaurants();
    handleUrlParams();
});

// Hamburger menu toggle with slide effect
const hamburgerBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
        if (mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.style.maxHeight = "0px";
            mobileMenu.style.opacity = 0;
            mobileMenu.style.transition = "max-height 0.5s ease, opacity 0.5s ease";
            
            requestAnimationFrame(() => {
                mobileMenu.style.maxHeight = "500px"; 
                mobileMenu.style.opacity = 1;
            });
        } else {
            mobileMenu.style.maxHeight = "0px";
            mobileMenu.style.opacity = 0;
            setTimeout(() => mobileMenu.classList.add('hidden'), 500);
        }

        hamburgerBtn.querySelector('i').classList.toggle('fa-bars');
        hamburgerBtn.querySelector('i').classList.toggle('fa-times');
    });
}

// Scroll to restaurants when category clicked
function filterAndScroll(category) {
    filterByCategory(category); 
    const menuSection = document.getElementById('restaurants'); 
    if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
