const scenes = {
  kitti00: {
    dataset: "KITTI Odometry",
    title: "Sequence 00",
    features: ["4,541 frames", "3.70 km", "Frequent loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/JGMVQaipF30AAAAAgOAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/kitti00.mp4",
    poster: "assets/images/poster_final_kitti00.jpg",
    trajectoryPoster: "assets/images/trajectory_final_kitti00.jpg"
  },
  kitti02: {
    dataset: "KITTI Odometry",
    title: "Sequence 02",
    features: ["4,661 frames", "5.10 km", "Large late loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/LsvaS6-58RIAAAAAgNAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/kitti02.mp4",
    poster: "assets/images/poster_final_kitti02.jpg",
    trajectoryPoster: "assets/images/trajectory_final_kitti02.jpg"
  },
  kitti05: {
    dataset: "KITTI Odometry",
    title: "Sequence 05",
    features: ["2,761 frames", "2.20 km", "Long-range loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/6mekTa3efLsAAAAAgIAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/kitti05.mp4",
    poster: "assets/images/poster_final_kitti05.jpg",
    trajectoryPoster: "assets/images/trajectory_final_kitti05.jpg"
  },
  vbr_campus_train0: {
    dataset: "VBR",
    title: "Campus-0",
    features: ["12,042 frames", "2.73 km", "Interleaved loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/8pepSq_HGUMAAAAAgtAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/vbr_campus_train0.mp4",
    poster: "assets/images/poster_final_vbr_campus_train0.jpg",
    trajectoryPoster: "assets/images/trajectory_final_vbr_campus_train0.jpg"
  },
  vbr_ciampino_train1: {
    dataset: "VBR",
    title: "Ciampino-1",
    features: ["18,846 frames", "5.20 km", "Long-interval loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/amDvRKtmXrwAAAAAhEAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/vbr_ciampino_train1.mp4",
    poster: "assets/images/poster_final_vbr_ciampino_train1.jpg",
    trajectoryPoster: "assets/images/trajectory_final_vbr_ciampino_train1.jpg"
  },
  vg02: {
    dataset: "Game captures",
    title: "GTA-V 1",
    features: ["4,848 frames", "1.71 km", "Dense loop closures", "Night-to-day transition"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/k6YrTYLk-fYAAAAAgWAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/vg02.mp4",
    poster: "assets/images/poster_final_vg02.jpg",
    trajectoryPoster: "assets/images/trajectory_final_vg02.jpg"
  },
  vg03: {
    dataset: "Game captures",
    title: "GTA-V 2",
    features: ["16,650 frames", "2.54 km", "Dense loop closures", "Speed variation"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/hMAlSJoT8voAAAAAg_AAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/vg03.mp4",
    poster: "assets/images/poster_final_vg03.jpg",
    trajectoryPoster: "assets/images/trajectory_final_vg03.jpg"
  },
  vg04: {
    dataset: "Game captures",
    title: "Assassin's Creed",
    features: ["9,739 frames", "2.54 km", "Dense loop closures"],
    demo: "https://gw.alipayobjects.com/v/huamei_vaouhm/afts/video/Sr7HR4yUrdQAAAAAgyAAAAgAfoeUAQBr",
    trajectory: "assets/videos/trajectory/vg04.mp4",
    poster: "assets/images/poster_final_vg04.jpg",
    trajectoryPoster: "assets/images/trajectory_final_vg04.jpg"
  }
};

const demoVideo = document.querySelector("#demo-video");
const trajectoryVideo = document.querySelector("#trajectory-video");
const demoSpeed = document.querySelector("#demo-speed");
const resultVideos = [demoVideo, trajectoryVideo];
const demoButtons = [...document.querySelectorAll(".demo-sequence-button")];
const trajectoryButtons = [...document.querySelectorAll(".trajectory-sequence-button")];
const sceneIds = Object.keys(scenes);
const KITTI_DEMO_PLAYBACK_RATE = 2;
const OTHER_DEMO_PLAYBACK_RATE = 5;
const TRAJECTORY_PLAYBACK_RATE = 2;
let demoIndex = 0;
let trajectoryIndex = 0;

function pauseAllVideos() {
  resultVideos.forEach((video) => video.pause());
}

function replaceVideo(video, source, poster, playbackRate, autoplay) {
  video.pause();
  video.poster = poster;
  video.querySelector("source").src = source;
  video.load();
  video.defaultPlaybackRate = playbackRate;
  video.playbackRate = playbackRate;
  if (autoplay) {
    video.play().catch(() => {
      // Keep native controls available if playback is blocked or interrupted.
    });
  }
}

function updateSceneLabels(prefix, scene, index) {
  const items = scene.features.map((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    return item;
  });
  document.querySelector(`#${prefix}-scene-stats`).replaceChildren(...items.slice(0, 2));
  document.querySelector(`#${prefix}-scene-features`).replaceChildren(...items.slice(2));
  const buttons = prefix === "demo" ? demoButtons : trajectoryButtons;
  buttons.forEach((button) => {
    const active = button.dataset.id === sceneIds[index];
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function selectDemo(index, autoplay = true) {
  demoIndex = (index + sceneIds.length) % sceneIds.length;
  const scene = scenes[sceneIds[demoIndex]];
  const rate = scene.dataset === "KITTI Odometry" ? KITTI_DEMO_PLAYBACK_RATE : OTHER_DEMO_PLAYBACK_RATE;
  demoSpeed.value = String(rate);
  updateSceneLabels("demo", scene, demoIndex);
  replaceVideo(demoVideo, scene.demo, scene.poster, rate, autoplay);
}

function selectTrajectory(index, autoplay = true) {
  trajectoryIndex = (index + sceneIds.length) % sceneIds.length;
  const scene = scenes[sceneIds[trajectoryIndex]];
  updateSceneLabels("trajectory", scene, trajectoryIndex);
  replaceVideo(trajectoryVideo, scene.trajectory, scene.trajectoryPoster, TRAJECTORY_PLAYBACK_RATE, autoplay);
}

function wireSceneList(buttons, select) {
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => select(index));
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
  });
}

wireSceneList(demoButtons, selectDemo);
wireSceneList(trajectoryButtons, selectTrajectory);

document.querySelector("#demo-prev").addEventListener("click", () => selectDemo(demoIndex - 1));
document.querySelector("#demo-next").addEventListener("click", () => selectDemo(demoIndex + 1));
document.querySelector("#trajectory-prev").addEventListener("click", () => selectTrajectory(trajectoryIndex - 1));
document.querySelector("#trajectory-next").addEventListener("click", () => selectTrajectory(trajectoryIndex + 1));

demoSpeed.addEventListener("change", () => {
  demoVideo.defaultPlaybackRate = Number(demoSpeed.value);
  demoVideo.playbackRate = Number(demoSpeed.value);
});
demoVideo.addEventListener("loadedmetadata", () => {
  demoVideo.defaultPlaybackRate = Number(demoSpeed.value);
  demoVideo.playbackRate = Number(demoSpeed.value);
});
trajectoryVideo.addEventListener("loadedmetadata", () => {
  trajectoryVideo.defaultPlaybackRate = TRAJECTORY_PLAYBACK_RATE;
  trajectoryVideo.playbackRate = TRAJECTORY_PLAYBACK_RATE;
});
resultVideos.forEach((video) => {
  video.addEventListener("play", () => {
    resultVideos.forEach((other) => { if (other !== video) other.pause(); });
  });
});
window.addEventListener("blur", pauseAllVideos);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseAllVideos();
});

const scheduleAnimation = document.querySelector(".schedule-animation");
if (scheduleAnimation) {
  const targetOrigin = window.location.protocol === "file:" ? "*" : window.location.origin;
  const scheduleVisibility = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) {
      scheduleAnimation.contentWindow?.postMessage({ type: "map2slam:pause-animation" }, targetOrigin);
    }
  });
  scheduleVisibility.observe(scheduleAnimation);
}

selectDemo(0, false);
selectTrajectory(0, false);
