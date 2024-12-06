const VERSION = "1.2";
const HOSTS = [
  {
    host: "bitbucket.org",
    nameRegex: /^(?:https?:\/\/)?(?:www.)?bitbucket.org\/.+\/(.+)\/?$/,
    PULL_REQUEST: "/pull-requests/",
    COMMITS: "/commits/",
    SOURCE: "/src/",
    CREATE_PULL_REQUEST: "/pull-requests/new"
  },
  {
    host: "github.com",
    nameRegex: /^(?:https?:\/\/)?(?:www.)?github.com\/.+\/(.+)\/?$/,
    PULL_REQUEST: "/pulls",
    COMMITS: "/commits",
    SOURCE: "/",
    CREATE_PULL_REQUEST: "/compare"
  }
];

async function loadReposFromStorage() {
  const settings = await getSettingsWithLatestVersion('repos');
  return settings.repos || [];
}

async function saveReposInStorage(repos) {
  await browser.storage.local.set({'version': VERSION, 'repos': repos});
}

function findHostSettingsByUrl(url) {
    const repoSetting = HOSTS
      .find(repoSettings => {
          let repoUrl = url;
          if (repoUrl.startsWith("https://")) repoUrl = repoUrl.substring("https://".length);
          if (repoUrl.startsWith("http://")) repoUrl = repoUrl.substring("http://".length);
          if (repoUrl.startsWith("www.")) repoUrl = repoUrl.substring("www.".length);

          return repoUrl.startsWith(repoSettings.host);
      });

    return repoSetting;
}


function findHostSettingsByHostname(name) {
    return HOSTS
      .find(repoSettings => repoSettings.host === name);
}

function extractRepoNameFromUrl(hostSettings, repoUrl) {
    const result = hostSettings.nameRegex.exec(repoUrl);
    return result && result[1];
}

async function getSettings() {
  return await getSettingsWithLatestVersion(null);
}

async function saveSettings(settings) {
  const newSettings = convertSettings(settings);
  validateSettings(newSettings);
  await browser.storage.local.set(newSettings);
}

async function getSettingsWithLatestVersion(itemKey) {
  let settings = await browser.storage.local.get(itemKey === null ? null : ["version", itemKey]);
  if (settings?.version === VERSION) {
    return settings;
  }

  settings = convertSettings(await browser.storage.local.get(null) || {});
  console.log('Updating old settings to version', settings.version);
  await browser.storage.local.set(settings);

  return getSettingsWithLatestVersion(itemKey);
}

function convertSettings(oldSettings) {
  let settings = {...oldSettings};

  // Convert version 1.0 to 1.1
  if (settings.version === undefined) {
    settings = {...settings, version: "1.1"};
  }

  settings.version = VERSION;
  return settings;
}

function validateSettings(settings) {
  const isString = val => typeof val === 'string' || val instanceof String;

  if (settings.version !== VERSION) {
    throw Error("Invalid settings, expected version " + VERSION + ", but is " + (repo.settings || "missing"));
  }

  if (settings.repos) {
    if (!Array.isArray(settings.repos)) {
      throw Error("Invalid settings, property 'repo' should be an array of repos.");
    }

    for (let repo of settings.repos) {
      console.log('check', repo.url);
      if (!repo.url || !isString(repo.url)) {
        throw Error("Every repo should have a 'url' field of type String.");
      } 
      if (repo.tag && !isString(repo.tag)) {
        throw Error("Field 'tag' of repo should be of type String.");
      }
    }
  }
}
