document.addEventListener('click', function(event) {
  var targetButton = event.target;

  // Проверяем, является ли кликнутый элемент кнопкой
  if (targetButton.classList.contains('toggleButton')) {
    var correspondingText = targetButton.nextElementSibling;

    // Добавляем или удаляем класс 'showText'
    correspondingText.classList.toggle('showText');

    // Управляем свойством 'display' для отображения и скрытия текста
    if (correspondingText.classList.contains('showText')) {
      correspondingText.style.display = 'block';
    } else {
      correspondingText.style.display = 'none';
    }
  }
});