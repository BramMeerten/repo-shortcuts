const REPO_CONTAINER_ID = "repo-list";

let repos = [];

document.addEventListener("DOMContentLoaded", () => {
  loadSettings().then(() => {});
  addImportAndExportSettingsEventListeners();
});

async function loadSettings() {
  repos = await loadReposFromStorage();
  const container = document.getElementById(REPO_CONTAINER_ID);
  container.textContent = '';

  [...repos, { url: ""}]
    .map(createRepoRowElement)
    .forEach(elem => container.appendChild(elem));
}

function createRepoRowElement(repo) {
  const div = document.createElement("div");
  const input = document.createElement("input");
  input.value = repo.url;
  input.placeholder = "Repo URL";
  input.addEventListener('keyup', () => {
    addOrRemoveLastInputElements();
    updateSettings();
  });
  div.appendChild(input);

  const tagInput = document.createElement("input");
  tagInput.value = repo.tag || null;
  tagInput.placeholder = "Tag";
  tagInput.addEventListener('keyup', () => {
     addOrRemoveLastInputElements();
     updateSettings();
  });
  div.appendChild(tagInput);

  return div;
}

function addOrRemoveLastInputElements() {
  const container = document.getElementById(REPO_CONTAINER_ID);
  const children = container.getElementsByTagName("input");

  if (children.length >= 2 && (children[children.length - 2].value?.trim() || children[children.length - 1].value?.trim())) {
    container.appendChild(createRepoRowElement({url: ""}));
  
  } else if (children.length >= 4 && (!children[children.length - 4].value?.trim() && !children[children.length - 3].value?.trim())) {
    container.removeChild(children[children.length - 1].parentElement);
  }
}

async function updateSettings() {
  const container = document.getElementById(REPO_CONTAINER_ID);
  const children = [...container.getElementsByTagName("input")];
  const repos = [];

  for (let i=0; i<children.length; i += 2) {
    const url = children[i].value?.trim();
    const tag = children[i+1].value?.trim();

    let error = false;
    if (!url) {
        error = true;
    } else {
        const hostSettings = findHostSettingsByUrl(url);
        error = !hostSettings || !extractRepoNameFromUrl(hostSettings, url);
    }

    const isLastRow = i === children.length-2;
    if (!error) {
      children[i].classList.remove("error");
      repos.push({url, tag: tag || undefined});

    } else if (!isLastRow) {
      children[i].classList.add("error");
    }
  }

  try {
    await saveReposInStorage(repos);
    setError(undefined);

  } catch(error) {
    console.error("Unexpected error saving repositories:", error);
    setError("Unexpected error. Failed to save settings.");
  }
}

function setError(error) {
  setErrorForElementWithId(error, "repo-list-error");
}

function setImportError(error) {
  setErrorForElementWithId(error, "import-error");
}

function setErrorForElementWithId(error, id) {
  const errorDiv = document.getElementById(id);
  if (!error) {
    errorDiv.style.display = "none";
  } else {
    errorDiv.innerText = error;
    errorDiv.style.display = "block";
  }
}

function addImportAndExportSettingsEventListeners() {
  const exportButton = document.getElementById("export-settings");
  exportButton.addEventListener('click', e => {
    e.preventDefault();
    exportSettings().then(() => {});
  });


  const importButton = document.getElementById("import-settings");
  importButton.addEventListener('click', e => {
    e.preventDefault();
    importSettings().then(() => {});
  });
}

async function exportSettings() {
  const settings = await getSettings();

  const element = document.createElement("a");
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings)));
  element.setAttribute('download', 'repo-shortcuts-settings.json');

  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

async function importSettings() {
  const input = document.createElement("input");

  input.setAttribute("type", "file");
  input.setAttribute("accept", ".json");

  input.addEventListener("change", e => {
    var files = e.target.files;
    const reader = new FileReader();
    reader.addEventListener( "load", () => {
      saveSettings(JSON.parse(reader.result))
        .then(() => loadSettings())
        .then(() => setImportError(null))
        .catch(error => {
          setImportError("Failed to parse settings.");
          console.error("Failed to parse settings.", error);
        });
    });

    if (files && files.length === 1) {
      reader.readAsText(files[0]);
    }
  });

  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}
