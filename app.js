const defaultCocktails = [
  {
    id: "spritz-pomme",
    nom: "Spritz Pomme",
    ingredients: ["Prosecco", "Eau pétillante", "Jus de pomme"],
    ingredientQuantities: { "Prosecco": 120, "Eau pétillante": 60, "Jus de pomme": 80 },
    avisChloe: "Frais, léger, parfait à l'apéro.",
    photoUrl: "https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "mule",
    nom: "Moscow Mule",
    ingredients: ["Vodka", "Ginger beer", "Citron vert"],
    ingredientQuantities: { "Vodka": 60, "Ginger beer": 120, "Citron vert": 30 },
    avisChloe: "Piquant comme il faut, très désaltérant.",
    photoUrl: "https://images.unsplash.com/photo-1514361892635-6d67377fca5b?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "virgin-sunset",
    nom: "Virgin Sunset",
    ingredients: ["Jus d'orange", "Sirop de grenadine", "Jus de pomme"],
    ingredientQuantities: { "Jus d'orange": 120, "Sirop de grenadine": 20, "Jus de pomme": 80 },
    avisChloe: "Sans alcool mais plein de goût.",
    photoUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "mojito",
    nom: "Mojito",
    ingredients: ["Rhum", "Menthe", "Citron vert", "Eau pétillante"],
    ingredientQuantities: { "Rhum": 50, "Menthe": 10, "Citron vert": 30, "Eau pétillante": 100 },
    avisChloe: "Un classique qui marche toujours.",
    photoUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80"
  }
];

const fallbackPhotoUrl = "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80";
const defaultIngredientMl = 50;
const defaultStockMl = 1000;

let cocktails = [...defaultCocktails];
let ingredientCatalog = [];
let stock = {};
let currentIngredientOptions = [];
let editingCocktailId = null;

function normalizeIngredientName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function deduplicateIngredients(ingredients) {
  const unique = [];
  const seen = new Set();

  ingredients.forEach(ingredient => {
    const cleaned = String(ingredient ?? "").trim();
    if (!cleaned) {
      return;
    }

    const key = normalizeIngredientName(cleaned);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    unique.push(cleaned);
  });

  return unique;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAllIngredientsFromCocktails() {
  return deduplicateIngredients(cocktails.flatMap(c => c.ingredients));
}

function getAllIngredients() {
  return deduplicateIngredients([...ingredientCatalog, ...getAllIngredientsFromCocktails()]).sort((a, b) => a.localeCompare(b));
}

function buildDefaultStock() {
  return Object.fromEntries(getAllIngredients().map(i => [i, defaultStockMl]));
}

function ensureStockCoverage() {
  const defaults = buildDefaultStock();
  stock = { ...defaults, ...stock };

  Object.keys(stock).forEach(key => {
    const number = Number(stock[key]);
    stock[key] = Number.isFinite(number) && number >= 0 ? number : defaults[key] ?? defaultStockMl;
  });
}

function getCocktailRequirements(cocktail) {
  const quantities = cocktail.ingredientQuantities ?? {};
  return Object.fromEntries(cocktail.ingredients.map(ingredient => [ingredient, toPositiveNumber(quantities[ingredient], defaultIngredientMl)]));
}

function getPossibleCocktailCount(cocktail) {
  const requirements = getCocktailRequirements(cocktail);
  const portions = Object.entries(requirements).map(([ingredient, neededMl]) => {
    const availableMl = stock[ingredient] ?? 0;
    return Math.floor(availableMl / neededMl);
  });

  if (portions.length === 0) {
    return 0;
  }

  const minPortion = Math.min(...portions);
  if (!Number.isFinite(minPortion)) {
    return 0;
  }

  return Math.max(0, minPortion);
}

function sanitizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

function formatIngredientListWithMl(cocktail) {
  const requirements = getCocktailRequirements(cocktail);
  return cocktail.ingredients.map(ingredient => `${escapeHtml(ingredient)} (${requirements[ingredient]} mL)`).join(", ");
}

function isCocktailAvailable(cocktail) {
  return getPossibleCocktailCount(cocktail) > 0;
}

function renderCarte() {
  const container = document.getElementById("cocktailList");
  const available = cocktails.filter(isCocktailAvailable);

  if (available.length === 0) {
    container.innerHTML = `<div class="empty">Aucun cocktail disponible avec le stock actuel.</div>`;
    return;
  }

  container.innerHTML = available
    .map(cocktail => {
      const count = sanitizeCount(getPossibleCocktailCount(cocktail));
      return `
      <article class="card">
        <h3>${escapeHtml(cocktail.nom)}</h3>
        <div><strong>Ingrédients :</strong> ${formatIngredientListWithMl(cocktail)}</div>
        <div class="stock-note">🍹 Quantité possible : ${count}</div>
        <div class="avis">💬 Avis de la Cheffe : ${escapeHtml(cocktail.avisChloe)}</div>
      </article>
    `;
    })
    .join("");
}

function renderPhotos() {
  const container = document.getElementById("photoList");
  const available = cocktails.filter(isCocktailAvailable);

  if (available.length === 0) {
    container.innerHTML = `<div class="empty">Aucune photo affichée car aucun cocktail n'est disponible.</div>`;
    return;
  }

  container.innerHTML = available
    .map(cocktail => {
      const count = sanitizeCount(getPossibleCocktailCount(cocktail));
      return `
      <article class="photo-card">
        <img src="${escapeHtml(cocktail.photoUrl || fallbackPhotoUrl)}" alt="${escapeHtml(cocktail.nom)}" loading="lazy" />
        <div class="photo-caption">${escapeHtml(cocktail.nom)} · ${count} dispo</div>
      </article>
    `;
    })
    .join("");
}

function renderAdminCocktails() {
  const container = document.getElementById("adminCocktailList");

  container.innerHTML = cocktails
    .map(cocktail => {
      const count = sanitizeCount(getPossibleCocktailCount(cocktail));
      return `
      <article class="card">
        <h3>${escapeHtml(cocktail.nom)}</h3>
        <div><strong>Ingrédients :</strong> ${formatIngredientListWithMl(cocktail)}</div>
        <div class="stock-note">🍹 Quantité possible : ${count}</div>
        <div class="card-actions">
          <button type="button" class="small" data-action="edit-cocktail" data-cocktail-id="${escapeHtml(cocktail.id)}">Modifier</button>
          <button type="button" class="small danger" data-action="delete-cocktail" data-cocktail-id="${escapeHtml(cocktail.id)}">Supprimer</button>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderStock() {
  const stockContainer = document.getElementById("stockList");
  const ingredients = getAllIngredients();

  stockContainer.innerHTML = ingredients
    .map((ingredient, index) => `
      <div class="stock-item">
        <label for="stock-qty-${index}">${escapeHtml(ingredient)}</label>
        <input
          id="stock-qty-${index}"
          class="stock-qty"
          type="number"
          min="0"
          step="1"
          value="${stock[ingredient] ?? defaultStockMl}"
          data-ingredient-index="${index}" />
        <span class="unit">mL</span>
        <button type="button" class="small danger" data-action="delete-ingredient" data-ingredient-index="${index}">Supprimer</button>
      </div>
    `)
    .join("")

  stockContainer.querySelectorAll("input.stock-qty").forEach(input => {
    input.addEventListener("change", async e => {
      const ingredientIndex = Number(e.target.dataset.ingredientIndex);
      const ingredient = ingredients[ingredientIndex];
      const value = Number(e.target.value);
      const quantity = Number.isFinite(value) && value >= 0 ? value : 0;

      await mutateAndSync(() => {
        stock[ingredient] = quantity;
      }, "Stock mis à jour ✅");
    });
  });

  stockContainer.querySelectorAll("button[data-action='delete-ingredient']").forEach(button => {
    button.addEventListener("click", async e => {
      const ingredientIndex = Number(e.target.dataset.ingredientIndex);
      const ingredient = ingredients[ingredientIndex];
      if (!ingredient) {
        return;
      }

      const impactedCocktails = cocktails.filter(c => c.ingredients.includes(ingredient));
      const impactedCount = impactedCocktails.length;
      const confirmMessage = impactedCount > 0
        ? `Supprimer « ${ingredient} » ? Il sera retiré de ${impactedCount} recette(s).`
        : `Supprimer « ${ingredient} » ?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      await mutateAndSync(() => {
        ingredientCatalog = ingredientCatalog.filter(i => normalizeIngredientName(i) !== normalizeIngredientName(ingredient));
        delete stock[ingredient];

        cocktails = cocktails
          .map(cocktail => {
            const nextIngredients = cocktail.ingredients.filter(i => normalizeIngredientName(i) !== normalizeIngredientName(ingredient));
            const nextQuantities = { ...(cocktail.ingredientQuantities ?? {}) };
            Object.keys(nextQuantities).forEach(key => {
              if (normalizeIngredientName(key) === normalizeIngredientName(ingredient)) {
                delete nextQuantities[key];
              }
            });

            return {
              ...cocktail,
              ingredients: nextIngredients,
              ingredientQuantities: nextQuantities
            };
          })
          .filter(cocktail => cocktail.ingredients.length > 0);
      }, "Ingrédient supprimé ✅");
    });
  });
}

function renderIngredientOptions(selectedIngredients = [], selectedQuantities = {}) {
  const container = document.getElementById("ingredientOptions");
  currentIngredientOptions = getAllIngredients();

  if (currentIngredientOptions.length === 0) {
    container.innerHTML = `<div class="empty">Ajoute d'abord un ingrédient.</div>`;
    return;
  }

  const selectedKeys = new Set(selectedIngredients.map(normalizeIngredientName));

  container.innerHTML = currentIngredientOptions
    .map((ingredient, index) => {
      const selected = selectedKeys.has(normalizeIngredientName(ingredient));
      const qty = toPositiveNumber(selectedQuantities[ingredient], defaultIngredientMl);
      return `
      <label class="ingredient-option" for="ingredient-${index}">
        <input
          id="ingredient-${index}"
          type="checkbox"
          name="ingredientOption"
          data-ingredient-index="${index}"
          ${selected ? "checked" : ""} />
        <span class="ingredient-name">${escapeHtml(ingredient)}</span>
        <input
          class="ingredient-qty"
          type="number"
          min="1"
          step="1"
          value="${qty}"
          data-qty-index="${index}" />
        <span class="unit">mL</span>
      </label>
    `;
    })
    .join("");
}

function getSelectedIngredientsWithQuantities() {
  const selected = Array.from(document.querySelectorAll("input[name='ingredientOption']:checked"));
  const ingredients = [];
  const ingredientQuantities = {};

  selected.forEach(input => {
    const index = Number(input.dataset.ingredientIndex);
    const ingredient = currentIngredientOptions[index];
    const qtyInput = document.querySelector(`input.ingredient-qty[data-qty-index='${index}']`);

    if (!ingredient) {
      return;
    }

    const quantity = toPositiveNumber(qtyInput?.value, defaultIngredientMl);
    ingredients.push(ingredient);
    ingredientQuantities[ingredient] = quantity;
  });

  return { ingredients, ingredientQuantities };
}

function showView(view) {
  const vueCarte = document.getElementById("vueCarte");
  const vuePhotos = document.getElementById("vuePhotos");
  const vueAdmin = document.getElementById("vueAdmin");
  const btnCarte = document.getElementById("btnCarte");
  const btnPhotos = document.getElementById("btnPhotos");
  const btnAdmin = document.getElementById("btnAdmin");

  vueCarte.classList.toggle("hidden", view !== "carte");
  vuePhotos.classList.toggle("hidden", view !== "photos");
  vueAdmin.classList.toggle("hidden", view !== "admin");
  btnCarte.classList.toggle("active", view === "carte");
  btnPhotos.classList.toggle("active", view === "photos");
  btnAdmin.classList.toggle("active", view === "admin");
}

function showAdminMessage(message, isError = false) {
  const messageElement = document.getElementById("adminMessage");
  messageElement.textContent = message;
  messageElement.classList.remove("hidden", "error", "success");
  messageElement.classList.add(isError ? "error" : "success");
}

function resetCocktailForm() {
  document.getElementById("addCocktailForm").reset();
  editingCocktailId = null;
  document.getElementById("saveCocktailBtn").textContent = "Ajouter le cocktail";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  renderIngredientOptions();
}

function beginEditCocktail(cocktailId) {
  const cocktail = cocktails.find(c => c.id === cocktailId);
  if (!cocktail) {
    showAdminMessage("Recette introuvable.", true);
    return;
  }

  editingCocktailId = cocktail.id;
  document.getElementById("cocktailName").value = cocktail.nom;
  document.getElementById("cocktailAvis").value = cocktail.avisChloe ?? "";
  document.getElementById("cocktailPhotoUrl").value = cocktail.photoUrl ?? "";
  renderIngredientOptions(cocktail.ingredients, getCocktailRequirements(cocktail));
  document.getElementById("saveCocktailBtn").textContent = "Enregistrer la recette";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  showView("admin");
  showAdminMessage(`Modification : ${cocktail.nom}`);
}

function getSnapshot() {
  return {
    cocktails,
    ingredientCatalog,
    stock
  };
}

function applySnapshot(data) {
  if (!data || !Array.isArray(data.cocktails) || !Array.isArray(data.ingredientCatalog) || typeof data.stock !== "object" || data.stock === null) {
    throw new Error("JSON invalide");
  }

  cocktails = data.cocktails;
  ingredientCatalog = deduplicateIngredients(data.ingredientCatalog);
  stock = data.stock;
  ensureStockCoverage();
  resetCocktailForm();
  renderAll();
}

function readGithubForm() {
  const owner = document.getElementById("ghOwner").value.trim();
  const repo = document.getElementById("ghRepo").value.trim();
  const branch = document.getElementById("ghBranch").value.trim() || "main";
  const path = document.getElementById("ghPath").value.trim() || "data.json";
  const token = document.getElementById("ghToken").value.trim();

  return { owner, repo, branch, path, token };
}

function requireGithubConfig() {
  const config = readGithubForm();
  if (!config.owner || !config.repo || !config.path || !config.token) {
    showAdminMessage("Renseigne owner/repo/path/token GitHub pour modifier les données.", true);
    return null;
  }

  return config;
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Utf8(base64) {
  const normalized = base64.replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getContentsApiPath(owner, repo, path) {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  return `/repos/${owner}/${repo}/contents/${encodedPath}`;
}

async function loadFromGithub() {
  const { owner, repo, branch, path, token } = requireGithubConfig() ?? {};
  if (!owner) {
    return;
  }

  const response = await fetch(`https://api.github.com${getContentsApiPath(owner, repo, path)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub ${response.status}`);
  }

  const file = await response.json();
  const text = decodeBase64Utf8(file.content);
  applySnapshot(JSON.parse(text));
  showAdminMessage("Données chargées depuis GitHub ✅");
}

async function saveToGithub(snapshot) {
  const { owner, repo, branch, path, token } = requireGithubConfig() ?? {};
  if (!owner) {
    throw new Error("Configuration GitHub incomplète");
  }

  const apiPath = getContentsApiPath(owner, repo, path);
  let sha;

  const getCurrent = await fetch(`https://api.github.com${apiPath}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (getCurrent.ok) {
    const current = await getCurrent.json();
    sha = current.sha;
  } else if (getCurrent.status !== 404) {
    throw new Error(`GitHub ${getCurrent.status}`);
  }

  const body = {
    message: "Update cocktail data",
    content: encodeBase64Utf8(JSON.stringify(snapshot, null, 2)),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const saveResponse = await fetch(`https://api.github.com${apiPath}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify(body)
  });

  if (!saveResponse.ok) {
    throw new Error(`GitHub ${saveResponse.status}`);
  }
}

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function renderAll() {
  renderStock();
  renderIngredientOptions();
  renderCarte();
  renderPhotos();
  renderAdminCocktails();
}

async function mutateAndSync(mutation, successMessage) {
  const config = requireGithubConfig();
  if (!config) {
    renderAll();
    return;
  }

  const previous = deepClone(getSnapshot());

  mutation();
  ensureStockCoverage();
  renderAll();

  try {
    await saveToGithub(getSnapshot());
    showAdminMessage(successMessage);
  } catch (error) {
    applySnapshot(previous);
    showAdminMessage(`Erreur GitHub: ${error.message}`, true);
  }
}

async function initializeData() {
  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("data.json introuvable");
    }

    const data = await response.json();
    applySnapshot(data);
  } catch {
    ingredientCatalog = getAllIngredientsFromCocktails();
    stock = buildDefaultStock();
    ensureStockCoverage();
    renderAll();
  }
}

document.getElementById("btnCarte").addEventListener("click", () => showView("carte"));
document.getElementById("btnPhotos").addEventListener("click", () => showView("photos"));
document.getElementById("btnAdmin").addEventListener("click", () => showView("admin"));

document.getElementById("resetStock").addEventListener("click", async () => {
  await mutateAndSync(() => {
    stock = buildDefaultStock();
  }, "Stock réinitialisé (1000 mL par ingrédient). ✅");
});

document.getElementById("addIngredientBtn").addEventListener("click", async () => {
  const input = document.getElementById("newIngredientInput");
  const newIngredient = input.value.trim();

  if (!newIngredient) {
    showAdminMessage("Nom d'ingrédient vide.", true);
    return;
  }

  const existing = getAllIngredients().find(i => normalizeIngredientName(i) === normalizeIngredientName(newIngredient));
  if (existing) {
    showAdminMessage(`Déjà présent dans la liste : ${existing}`, true);
    return;
  }

  await mutateAndSync(() => {
    ingredientCatalog = deduplicateIngredients([...ingredientCatalog, newIngredient]);
  }, "Ingrédient ajouté à la liste ✅");

  renderIngredientOptions([newIngredient], { [newIngredient]: defaultIngredientMl });
  input.value = "";
});

document.getElementById("adminCocktailList").addEventListener("click", async e => {
  const button = e.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const cocktailId = button.dataset.cocktailId;
  if (!cocktailId) {
    return;
  }

  if (button.dataset.action === "edit-cocktail") {
    beginEditCocktail(cocktailId);
    return;
  }

  if (button.dataset.action === "delete-cocktail") {
    const cocktail = cocktails.find(c => c.id === cocktailId);
    if (!cocktail) {
      showAdminMessage("Recette introuvable.", true);
      return;
    }

    if (!window.confirm(`Supprimer la recette « ${cocktail.nom} » ?`)) {
      return;
    }

    await mutateAndSync(() => {
      cocktails = cocktails.filter(c => c.id !== cocktailId);

      if (editingCocktailId === cocktailId) {
        editingCocktailId = null;
      }
    }, "Recette supprimée ✅");

    if (!editingCocktailId) {
      resetCocktailForm();
    }
  }
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  resetCocktailForm();
  showAdminMessage("Modification annulée.");
});

document.getElementById("addCocktailForm").addEventListener("submit", async e => {
  e.preventDefault();

  const nom = document.getElementById("cocktailName").value.trim();
  const { ingredients, ingredientQuantities } = getSelectedIngredientsWithQuantities();
  const avisChloeInput = document.getElementById("cocktailAvis").value.trim();
  const photoUrlInput = document.getElementById("cocktailPhotoUrl").value.trim();

  if (!nom || ingredients.length === 0) {
    showAdminMessage("Nom et au moins un ingrédient obligatoires.", true);
    return;
  }

  const isEditMode = Boolean(editingCocktailId);

  await mutateAndSync(() => {
    if (isEditMode) {
      cocktails = cocktails.map(cocktail => {
        if (cocktail.id !== editingCocktailId) {
          return cocktail;
        }

        return {
          ...cocktail,
          nom,
          ingredients,
          ingredientQuantities,
          avisChloe: avisChloeInput || "Nouveau cocktail à tester.",
          photoUrl: photoUrlInput || fallbackPhotoUrl
        };
      });
    } else {
      cocktails.push({
        id: `${slugify(nom)}-${Date.now().toString(36)}`,
        nom,
        ingredients,
        ingredientQuantities,
        avisChloe: avisChloeInput || "Nouveau cocktail à tester.",
        photoUrl: photoUrlInput || fallbackPhotoUrl
      });
    }

    ingredientCatalog = deduplicateIngredients([...ingredientCatalog, ...ingredients]);
  }, isEditMode ? "Recette modifiée ✅" : "Cocktail ajouté ✅");

  resetCocktailForm();
});

document.getElementById("loadFromGithubBtn").addEventListener("click", async () => {
  try {
    await loadFromGithub();
  } catch (error) {
    showAdminMessage(`Erreur chargement GitHub: ${error.message}`, true);
  }
});

initializeData();