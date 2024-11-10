// Открытие модального окна
function openModal(src) {
    const modal = document.getElementById("modal");
    const modalImage = document.getElementById("modal-image");
    modal.style.display = "flex";
    modalImage.src = src;
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
}
