// ==========================================
// LOGIKA CAROUSEL HERO IMAGE
// ==========================================
const images = [
  "assets/img/hero-img.png",
  "assets/img/hero-img1.png",
  "assets/img/hero-img2.png",
  "assets/img/hero-img3.png",
  "assets/img/hero-img4.png",
];

let currentIndex = 0;
const heroImg = document.getElementById("heroImg");
const dotsContainer = document.getElementById("carouselDots");
let slideInterval;

// Buat elemen titik (dots)
images.forEach((_, index) => {
  const dot = document.createElement("div");
  dot.classList.add("dot");
  if (index === 0) dot.classList.add("active");

  // Event listener jika dot diklik
  dot.addEventListener("click", () => goToSlide(index));
  dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll(".dot");

// Fungsi mengganti gambar dengan transisi
function changeImage(index) {
  heroImg.classList.add("fade-out"); // Tambahkan kelas pudar

  // Ganti src saat gambar sedang memudar (sinkron dengan waktu CSS 0.4s)
  setTimeout(() => {
    heroImg.src = images[index];
    updateDots(index);
    heroImg.classList.remove("fade-out"); // Tampilkan gambar baru
  }, 400);
}

function nextSlide() {
  currentIndex = (currentIndex + 1) % images.length;
  changeImage(currentIndex);
}

function goToSlide(index) {
  if (currentIndex === index) return;
  currentIndex = index;
  changeImage(currentIndex);
  resetInterval(); // Ulangi timer agar tidak langsung ganti lagi
}

function updateDots(index) {
  dots.forEach((dot) => dot.classList.remove("active"));
  dots[index].classList.add("active");
}

// Timer pergantian slide (4 detik = 4000ms)
function startInterval() {
  slideInterval = setInterval(nextSlide, 4000);
}

function resetInterval() {
  clearInterval(slideInterval);
  startInterval();
}

startInterval();

// ==========================================
// LOGIKA LIGHTBOX (Bawaan)
// ==========================================
const lightbox = document.getElementById("imageLightbox");
const lightboxImg = document.getElementById("lightboxImg");
const closeBtn = document.querySelector(".lightbox-close");

// Tampilkan popup saat gambar diklik (menggunakan src yang aktif saat ini)
heroImg.addEventListener("click", function () {
  lightbox.classList.add("show");
  lightboxImg.src = this.src;
});

// Tutup popup saat tombol silang (X) diklik
closeBtn.addEventListener("click", function () {
  lightbox.classList.remove("show");
});

// Tutup popup saat area gelap di luar gambar diklik
lightbox.addEventListener("click", function (e) {
  if (e.target !== lightboxImg) {
    lightbox.classList.remove("show");
  }
});
