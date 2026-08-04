document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const header = document.querySelector("[data-header]");

  if (menuToggle && header) {
    menuToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    header.querySelectorAll(".site-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  initializeRadar();
});

function initializeRadar() {
  const radarPage = document.querySelector(".radar-page");
  if (!radarPage) return;

  const queryInput = document.querySelector("#market-query");
  const segmentInput = document.querySelector("#segment-filter");
  const stateSelect = document.querySelector("#state-filter");
  const cityInput = document.querySelector("#city-filter");
  const sizeInputs = [...document.querySelectorAll('[data-filter="size"]')];
  const phoneInput = document.querySelector('[data-filter="phone"]');
  const emailInput = document.querySelector('[data-filter="email"]');
  const whatsappInput = document.querySelector('[data-filter="whatsapp"]');
  const partnerInput = document.querySelector('[data-filter="partner"]');
  const rows = [...document.querySelectorAll("[data-company-rows] tr")];
  const tableWrap = document.querySelector(".company-table-wrap");
  const resultsFooter = document.querySelector(".results-footer");
  const emptyState = document.querySelector("[data-empty]");
  const activeFilterList = document.querySelector("[data-active-filters]");
  const filterCount = document.querySelector("[data-filter-count]");
  const resultTotal = document.querySelector("[data-result-total]");
  const visibleCount = document.querySelector("[data-visible-count]");
  const footerCount = document.querySelector("[data-footer-count]");
  const footerTotal = document.querySelector("[data-footer-total]");
  let queryValue = "";
  let toastTimer;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  document.querySelectorAll(".filter-group__toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const group = toggle.closest(".filter-group");
      const isOpen = group.classList.toggle("filter-group--open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  });

  function selectedSize() {
    return sizeInputs.find((input) => input.checked)?.value || "";
  }

  function getFilters() {
    return {
      query: normalize(queryValue),
      state: stateSelect?.value || "",
      city: normalize(cityInput?.value),
      segment: normalize(segmentInput?.value),
      size: selectedSize(),
      phone: Boolean(phoneInput?.checked),
      email: Boolean(emailInput?.checked),
      whatsapp: Boolean(whatsappInput?.checked),
      partner: Boolean(partnerInput?.checked),
    };
  }

  function makeChip(label, key) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.chip = key;
    button.innerHTML = `${label} <i>×</i>`;
    button.addEventListener("click", () => removeFilter(key));
    return button;
  }

  function renderChips(filters) {
    activeFilterList.innerHTML = "";
    activeFilterList.append(makeChip("Empresas ativas", "status"));

    const chips = [];
    if (filters.query) chips.push([queryValue, "query"]);
    if (filters.state) chips.push([filters.state, "state"]);
    if (filters.city) chips.push([cityInput.value, "city"]);
    if (filters.segment) chips.push([segmentInput.value, "segment"]);
    if (filters.size) chips.push([`Porte ${filters.size}`, "size"]);
    if (filters.phone) chips.push(["Com telefone", "phone"]);
    if (filters.email) chips.push(["Com e-mail", "email"]);
    if (filters.whatsapp) chips.push(["Com WhatsApp", "whatsapp"]);
    if (filters.partner) chips.push(["Sócio identificado", "partner"]);
    chips.forEach(([label, key]) => activeFilterList.append(makeChip(label, key)));
    filterCount.textContent = String(chips.length + 1);
  }

  function removeFilter(key) {
    if (key === "status") return;
    if (key === "query") {
      queryValue = "";
      queryInput.value = "";
    }
    if (key === "state") stateSelect.value = "";
    if (key === "city") cityInput.value = "";
    if (key === "segment") segmentInput.value = "";
    if (key === "size") sizeInputs[0].checked = true;
    if (key === "phone") phoneInput.checked = false;
    if (key === "email") emailInput.checked = false;
    if (key === "whatsapp") whatsappInput.checked = false;
    if (key === "partner") partnerInput.checked = false;
    applyFilters();
  }

  function estimateTotal(filters, matchingRows) {
    let total = 18642;
    if (filters.query) total *= 0.18;
    if (filters.state) total *= filters.state === "SP" ? 0.45 : 0.18;
    if (filters.city) total *= 0.12;
    if (filters.segment) total *= 0.2;
    if (filters.size) total *= filters.size === "ME" ? 0.36 : filters.size === "EPP" ? 0.29 : 0.19;
    if (filters.phone) total *= 0.756;
    if (filters.email) total *= 0.61;
    if (filters.whatsapp) total *= 0.48;
    if (filters.partner) total *= 0.89;
    if (matchingRows === 0) return 0;
    return Math.max(matchingRows, Math.round(total));
  }

  function applyFilters() {
    const filters = getFilters();
    let matchingRows = 0;

    rows.forEach((row) => {
      const searchable = normalize(`${row.dataset.name} ${row.dataset.segment} ${row.dataset.city} ${row.dataset.state}`);
      const isMatch =
        (!filters.query || searchable.includes(filters.query)) &&
        (!filters.state || row.dataset.state === filters.state) &&
        (!filters.city || normalize(row.dataset.city).includes(filters.city)) &&
        (!filters.segment || normalize(row.dataset.segment).includes(filters.segment)) &&
        (!filters.size || row.dataset.size === filters.size) &&
        (!filters.phone || row.dataset.phone === "true") &&
        (!filters.email || row.dataset.email === "true") &&
        (!filters.whatsapp || row.dataset.whatsapp === "true");

      row.hidden = !isMatch;
      if (isMatch) matchingRows += 1;
    });

    const estimate = estimateTotal(filters, matchingRows);
    resultTotal.textContent = estimate.toLocaleString("pt-BR");
    visibleCount.textContent = `${matchingRows} ${matchingRows === 1 ? "visível" : "visíveis"}`;
    footerCount.textContent = String(matchingRows);
    footerTotal.textContent = estimate.toLocaleString("pt-BR");
    tableWrap.hidden = matchingRows === 0;
    resultsFooter.hidden = matchingRows === 0;
    emptyState.hidden = matchingRows !== 0;
    renderChips(filters);
  }

  function clearFilters() {
    queryValue = "";
    queryInput.value = "";
    segmentInput.value = "";
    stateSelect.value = "";
    cityInput.value = "";
    sizeInputs[0].checked = true;
    phoneInput.checked = false;
    emailInput.checked = false;
    whatsappInput.checked = false;
    partnerInput.checked = false;
    applyFilters();
  }

  function showToast(title, message, icon = "✓") {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;
    toast.querySelector(":scope > span").textContent = icon;
    toast.querySelector("b").textContent = title;
    toast.querySelector("small").textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  document.querySelectorAll("[data-clear]").forEach((button) => button.addEventListener("click", clearFilters));

  document.querySelectorAll("[data-filter]").forEach((control) => {
    const eventName = control.matches('input[type="text"]') ? "input" : "change";
    control.addEventListener(eventName, applyFilters);
  });

  document.querySelector("[data-search]")?.addEventListener("click", () => {
    queryValue = queryInput.value.trim();
    applyFilters();
  });

  queryInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      queryValue = queryInput.value.trim();
      applyFilters();
    }
  });

  document.querySelector("[data-suggestion]")?.addEventListener("click", () => {
    queryInput.value = "";
    queryValue = "";
    segmentInput.value = "Tecnologia";
    stateSelect.value = "SP";
    phoneInput.checked = true;
    emailInput.checked = true;
    applyFilters();
    showToast("Mercado sugerido", "Tecnologia B2B em São Paulo com contato disponível.", "✦");
  });

  document.querySelector("[data-save-search]")?.addEventListener("click", () => {
    showToast("Busca salva", "Você poderá acessá-la em “Listas”.");
  });

  document.querySelector("[data-export]")?.addEventListener("click", () => {
    showToast("Exportação preparada", "Uma prévia com as empresas visíveis foi criada.", "↓");
  });

  const checkAll = document.querySelector("[data-check-all]");
  checkAll?.addEventListener("change", () => {
    rows.filter((row) => !row.hidden).forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.checked = checkAll.checked;
      row.classList.toggle("is-selected", checkAll.checked);
    });
  });

  rows.forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => row.classList.toggle("is-selected", checkbox.checked));
  });

  const globalSearch = document.querySelector(".app-search input");
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalSearch?.focus();
    }
  });

  applyFilters();
}
