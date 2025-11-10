(function () {
    const isHome = document.querySelector('.campaign-panel') !== null;
    const isEdit = document.querySelector('.editor') !== null;
  
    const openOverlay = (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'grid';
    };
    const closeAll = () => {
      document.querySelectorAll('.overlay').forEach(o => o.style.display = 'none');
    };
    document.querySelectorAll('.close-modal').forEach(b => {
      b.addEventListener('click', closeAll);
    });
  
    if (isHome) {
      const campSearch = document.getElementById('campSearch');
      const campList = document.getElementById('campaignList');
      const wsTitle = document.getElementById('wsTitle');
      const wsCount = document.getElementById('wsCount');
      const delPostText = document.getElementById('delPostText');
      let pendingDeletePostIndex = null;

      campList.addEventListener('click', (e) => {
        const card = e.target.closest('.campaign-card');
        if (!card) return;
        campList.querySelectorAll('.campaign-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const name = card.dataset.name || 'Untitled';
        const posts = card.dataset.posts || '0';
        if (wsTitle) wsTitle.textContent = name;
        if (wsCount) wsCount.textContent = `${posts} ${Number(posts) === 1 ? 'post' : 'posts'}`;
      });
  
      if (campSearch) {
        campSearch.addEventListener('input', () => {
          const q = campSearch.value.trim().toLowerCase();
          const cards = campList.querySelectorAll('.campaign-card');
          let any = false;
          cards.forEach(card => {
            const name = (card.dataset.name || '').toLowerCase();
            const match = name.includes(q);
            card.style.display = match ? '' : 'none';
            if (match) any = true;
          });
          if (!any) {
            if (!campList.querySelector('.campaign-empty')) {
              const div = document.createElement('div');
              div.className = 'campaign-empty';
              div.textContent = 'No campaign matched.';
              campList.appendChild(div);
            }
          } else {
            const empty = campList.querySelector('.campaign-empty');
            if (empty) empty.remove();
          }
        });
      }
  
      document.querySelectorAll('[data-action="simulate"]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = 'simulate-rollout.html';
        });
      });
      document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', () => {
          alert('Logged out (demo).');
        });
      });
      document.querySelectorAll('[data-action="share"]').forEach(btn => {
        btn.addEventListener('click', () => openOverlay('overlay-share'));
      });
      document.querySelectorAll('[data-action="create-campaign"]').forEach(btn => {
        btn.addEventListener('click', () => openOverlay('overlay-create'));
      });
      document.querySelectorAll('[data-action="delete-campaign"]').forEach(btn => {
        btn.addEventListener('click', () => openOverlay('overlay-del-camp'));
      });
  
      const confirmCreateBtn = document.querySelector('[data-action="confirm-create"]');
      if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('newCampaignName');
          const name = (nameInput && nameInput.value.trim()) || 'New campaign';
          const div = document.createElement('div');
          div.className = 'campaign-card';
          div.dataset.name = name;
          div.dataset.posts = '0';
          div.innerHTML = `<div class="campaign-name">${name}</div><div class="campaign-meta">0 posts</div>`;
          campList.appendChild(div);
          campList.querySelectorAll('.campaign-card').forEach(c => c.classList.remove('active'));
          div.classList.add('active');
          wsTitle.textContent = name;
          wsCount.textContent = '0 posts';
          closeAll();
          if (nameInput) nameInput.value = '';
        });
      }
  
      const confirmDelCampBtn = document.querySelector('[data-action="confirm-delete-campaign"]');
      if (confirmDelCampBtn) {
        confirmDelCampBtn.addEventListener('click', () => {
          const active = campList.querySelector('.campaign-card.active');
          if (active) {
            const next = active.nextElementSibling || active.previousElementSibling;
            active.remove();
            if (next && next.classList.contains('campaign-card')) {
              next.classList.add('active');
              wsTitle.textContent = next.dataset.name || 'Campaign';
              const p = next.dataset.posts || '0';
              wsCount.textContent = `${p} ${Number(p) === 1 ? 'post' : 'posts'}`;
            } else {
              wsTitle.textContent = 'No campaign';
              wsCount.textContent = '0 posts';
            }
          }
          closeAll();
        });
      }
  
      document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const n = parseInt(btn.getAttribute('data-index'), 10) || 1;
          pendingDeletePostIndex = n;
          if (delPostText) delPostText.textContent = `Are you sure you want to delete post ${n}?`;
          openOverlay('overlay-del-post');
        });
      });
  
      const confirmDelPostBtn = document.querySelector('[data-action="confirm-delete-post"]');
      if (confirmDelPostBtn) {
        confirmDelPostBtn.addEventListener('click', () => {
          if (pendingDeletePostIndex != null) {
            const post = document.querySelector(`.post [data-index="${pendingDeletePostIndex}"]`)?.closest('.post');
            if (post) post.remove();
          }
          pendingDeletePostIndex = null;
          closeAll();
        });
      }
  
      const editPost3Btn = document.getElementById('editPost3Btn');
      if (editPost3Btn) {
        editPost3Btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = 'edit.html';
        });
      }
  
      const addPostBtn = document.getElementById('addPostBtn');
      if (addPostBtn) {
        addPostBtn.addEventListener('click', () => {
          alert('New post flow (demo).');
        });
      }
    }
  
    if (isEdit) {
      document.querySelectorAll('[data-action="cancel-edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = 'index.html';
        });
      });
      document.querySelectorAll('[data-action="save-edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = 'index.html';
        });
      });
  
      document.getElementById('photoList')?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-remove-photo]');
        if (!target) return;
        target.parentElement?.remove();
      });
  
      document.getElementById('addPhotoBtn')?.addEventListener('click', () => {
        const wrap = document.getElementById('photoList');
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `<span>new-photo.png</span><span class="x" data-remove-photo>×</span>`;
        wrap.appendChild(row);
      });

      document.getElementById('hashtagList')?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-remove-tag]');
        if (!target) return;
        target.parentElement?.remove();
      });
  
      document.getElementById('addHashtagBtn')?.addEventListener('click', () => {
        const wrap = document.getElementById('hashtagList');
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = '#newtag <span class="x" data-remove-tag>×</span>';
        wrap.appendChild(chip);
      });
    }
  })();
  