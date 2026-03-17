AFRAME.registerComponent('smart-loader', {
  schema: { filename: { type: 'string' } },
  update: function () {
    const el = this.el;
    const filename = this.data.filename;
    if (!filename) return;
    el.setAttribute('src', `imageLow/${filename}`);
    const highResImg = new Image();
    highResImg.src = `images/${filename}`;
    highResImg.onload = () => { el.setAttribute('src', `images/${filename}`); };
  }
});

AFRAME.registerComponent('tour-manager', {
  init: function () {
    this.scenes = null;
    fetch('scenes.json')
      .then(res => res.json())
      .then(data => {
        this.scenes = data;
        const lastScene = localStorage.getItem('lastVisitedScene');
        // 記憶があればそれ、なければ B1
        const startScene = (lastScene && data[lastScene]) ? lastScene : "A1";
        
        // 初回起動時は「即時(immediate)」で描画
        this.renderScene(startScene, true);
        
        // 最初だけ右を向く（Rigの回転）
        const rig = document.querySelector('#cam-rig');
        if (rig && startScene === "A1") {
          rig.setAttribute('rotation', '0 -90 0');
        }
      });
  },

  renderScene: function (sceneId, immediate = false) {
    if (!this.scenes || !this.scenes[sceneId]) return;
    localStorage.setItem('lastVisitedScene', sceneId);

    const config = this.scenes[sceneId];
    const sky = document.querySelector('#main-sky');
    const container = document.querySelector('#hotspot-group');
    const rig = document.querySelector('#cam-rig');

    // シーン切り替え時に必ずリグの座標をリセットし、古いアニメーションを消す
    if (rig) {
      rig.removeAttribute('animation__move'); // 動いている最中のアニメーションを停止
      rig.setAttribute('position', '0 1.6 0'); // 座標を中央に戻す
    }

    const updateContent = () => {
      // 背景更新時のフェード（少し透明にしてから戻す）
      if (!immediate) {
        sky.removeAttribute('animation__fade');
        sky.setAttribute('animation__fade', 'property: material.opacity; from: 0.5; to: 1; dur: 400');
      }
      
      sky.setAttribute('smart-loader', { filename: config.filename });
      sky.setAttribute('rotation', config.rotation);
      container.innerHTML = '';

      config.hotspots.forEach(hs => {
        const spotGroup = document.createElement('a-entity');
        const p = hs.pos.split(' ');
        spotGroup.setAttribute('position', `${p[0]} 0.1 ${p[2]}`);

        const hitBox = document.createElement('a-cylinder');
        hitBox.setAttribute('radius', '0.8'); 
        hitBox.setAttribute('height', '0.4');
        hitBox.setAttribute('class', 'clickable'); 
        hitBox.setAttribute('material', 'visible: false');
        spotGroup.appendChild(hitBox);

        const ring = document.createElement('a-ring');
        ring.setAttribute('radius-inner', '0.35'); 
        ring.setAttribute('radius-outer', '0.5');
        ring.setAttribute('rotation', '-90 0 0'); 
        ring.setAttribute('material', 'color: white; opacity: 0.7; transparent: true');
        spotGroup.appendChild(ring);

        const dot = document.createElement('a-circle');
        dot.setAttribute('radius', '0.15'); 
        dot.setAttribute('rotation', '-90 0 0');
        dot.setAttribute('material', 'color: #4285F4; opacity: 0.9; transparent: true');
        spotGroup.appendChild(dot);

        // ホバー演出
        hitBox.addEventListener('mouseenter', () => {
          ring.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; dur: 200');
          ring.setAttribute('material', 'color: #4285F4; opacity: 1');
        });
        hitBox.addEventListener('mouseleave', () => {
          ring.setAttribute('animation', 'property: scale; to: 1 1 1; dur: 200');
          ring.setAttribute('material', 'color: white; opacity: 0.7');
        });

        // クリックで移動開始
        hitBox.addEventListener('click', () => this.startTransition(hs.to, hs.pos));
        container.appendChild(spotGroup);
        
        // 隣接シーンの先読み
        const next = this.scenes[hs.to];
		  if (next) { 
			const preImg = new Image();
			preImg.src = `imageLow/${next.filename}`; // LOWだけ！

			// HIGHはブラウザが暇な時に読み込むようにする（オプション）
			preImg.onload = () => {
				// LOWが読み終わってから、こっそりHIGHも開始（優先度低）
				setTimeout(() => {
					new Image().src = `images/${next.filename}`;
				}, 1000);
    };
  }
});
    };

    updateContent();
  },

  startTransition: function(nextId, posStr) {
    const rig = document.querySelector('#cam-rig');
    const sky = document.querySelector('#main-sky');
    const p = posStr.split(' ');
    
    // 目的地へズーム
    rig.removeAttribute('animation__move');
    rig.setAttribute('animation__move', {
      property: 'position',
      to: `${p[0]} 1.6 ${p[2]}`,
      dur: 500,
      easing: 'easeInQuad'
    });

    // 背景を少し透かす
    sky.removeAttribute('animation__fade');
    sky.setAttribute('animation__fade', 'property: material.opacity; from: 1; to: 0.5; dur: 300');

    // ズームが終わったら描画を切り替える
    setTimeout(() => {
      this.renderScene(nextId);
    }, 500);
  }
});