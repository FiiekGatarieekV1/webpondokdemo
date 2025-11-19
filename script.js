// Hero Swiper (clean, auto + dots)
var heroSwiper = new Swiper(".hero-swiper", {
  loop: true,
  autoplay: {
    delay: 4000,
    disableOnInteraction: false,
  },
  effect: "fade", // bisa coba "slide" kalau mau geser biasa
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
});
