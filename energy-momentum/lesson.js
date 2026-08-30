(function () {
  "use strict";
  const t = (key, english, vars) => (window.I18N ? window.I18N.t(key, english, vars) : english);
  const slides = [...document.querySelectorAll(".slide")];
  const dots = document.getElementById("dots");
  const toc = document.getElementById("toc");
  let index = 0;

  document.getElementById("total").textContent = slides.length;
  slides.slice(1).forEach((slide, slideIndex) => {
    slide.querySelector(".step").textContent = String(slideIndex + 1).padStart(2, "0");
  });

  slides.forEach((slide, slideIndex) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", t("js.lesson.goto", "Go to {title}", { title: slide.dataset.title }));
    dot.addEventListener("click", () => show(slideIndex));
    dots.appendChild(dot);
    if (slideIndex > 0) {
      const item = document.createElement("button");
      item.type = "button";
      item.innerHTML = `<b>${String(slideIndex).padStart(2, "0")}</b>${slide.dataset.title}`;
      item.addEventListener("click", () => show(slideIndex));
      toc.appendChild(item);
    }
  });

  function show(nextIndex) {
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    slides.forEach((slide, slideIndex) => slide.classList.toggle("on", slideIndex === index));
    [...dots.children].forEach((dot, slideIndex) => dot.classList.toggle("on", slideIndex === index));
    document.getElementById("current").textContent = index + 1;
    document.getElementById("slideTitle").textContent = slides[index].dataset.title;
    document.getElementById("prev").disabled = index === 0;
    document.getElementById("next").disabled = index === slides.length - 1;
    document.getElementById("progress").style.width = `${index / (slides.length - 1) * 100}%`;
    window.dispatchEvent(new CustomEvent("lesson:slide", { detail: { simulator: slides[index].dataset.simulator || "" } }));
    history.replaceState(null, "", `#${index + 1}`);
  }

  window.addEventListener("i18n:change", () => {
    [...toc.children].forEach((item, tocIndex) => {
      item.innerHTML = `<b>${String(tocIndex + 1).padStart(2, "0")}</b>${slides[tocIndex + 1].dataset.title}`;
    });
    [...dots.children].forEach((dot, dotIndex) => {
      dot.setAttribute("aria-label", t("js.lesson.goto", "Go to {title}", { title: slides[dotIndex].dataset.title }));
    });
    show(index);
  });

  document.getElementById("prev").addEventListener("click", () => show(index - 1));
  document.getElementById("next").addEventListener("click", () => show(index + 1));
  document.addEventListener("keydown", (event) => {
    if (["INPUT", "BUTTON"].includes(event.target.tagName)) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") show(index + 1);
    if (event.key === "ArrowLeft" || event.key === "PageUp") show(index - 1);
    if (event.key === "Home") show(0);
    if (event.key === "End") show(slides.length - 1);
  });

  const initial = Number.parseInt(location.hash.slice(1), 10);
  show(Number.isFinite(initial) ? initial - 1 : 0);
}());
