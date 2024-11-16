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
  const repos = await browser.storage.local.get('repos');
  return repos?.repos || [];
}

async function saveReposInStorage(repos) {
  await browser.storage.local.set({'repos': repos});
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
