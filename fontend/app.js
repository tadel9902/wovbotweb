// Tự động chọn API base tùy môi trường
const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:5000" // local backend
  : window.location.origin;  // production

console.log("🔗 API_BASE =", API_BASE);



let activeSearchType = "username"; // mặc định

document.addEventListener("DOMContentLoaded", function () {
  // Hiệu ứng fade-in
  document.querySelectorAll(".fade").forEach((el) => el.classList.add("show"));

  // Tab switching
  const tabs = document.querySelectorAll(".tab");
  const tabContainer = document.querySelector(".tab-container");
  const searchInput = document.getElementById("searchInput");

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const newPlaceholder = tab.getAttribute("data-placeholder");
      searchInput.setAttribute("placeholder", newPlaceholder);

      activeSearchType = tab.getAttribute("data-type"); // lưu loại tab đang chọn

      tabContainer.style.setProperty("--tab-index", index);
    });
  });

  // Xử lý tìm kiếm
  document.querySelector(".btn-apply").addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query || query.length < 3) {
      alert("Vui lòng nhập ít nhất 3 ký tự.");
      return;
    }

    try {
      if (activeSearchType === "username") {
        const res = await safeFetch(`${API_BASE}/api/user/search?username=${encodeURIComponent(query)}`);
        if (!res) { alert('Không thể kết nối tới API'); return; }
        if (res.error) { alert(res.error); return; }
        const { player, history } = res;
        renderCharacterCard(player, history);
      } else if (activeSearchType === "oldusername") {
        const res = await safeFetch(`${API_BASE}/api/user/search-old?query=${encodeURIComponent(query)}`);
        if (!res) { alert('Không thể kết nối tới API'); return; }
        if (res.error) { alert(res.error); return; }

        const users = res.users || [];
        if (users.length === 0) {
          alert("Không tìm thấy người dùng với Old Username này.");
        } else if (users.length === 1) {
          // Nếu chỉ 1 kết quả: lấy chi tiết từ API theo ID (đảm bảo luôn lấy thông tin mới nhất)
          const u = users[0];
          const detail = await fetchUserDetailById(u.user_id);
          if (detail && detail.player) {
            renderCharacterCard(detail.player, detail.history);
          } else {
            // fallback: render DB data nếu API lỗi
            renderCharacterCard({ id: u.user_id, username: u.username }, u.history);
          }
        } else {
          renderUserList(users, query);
        }
      } else {
        alert("Loại tìm kiếm không hợp lệ.");
      }
    } catch (err) {
      console.error("Lỗi khi gọi API:", err);
      alert("Không thể tìm thấy người dùng.");
    }
  });
});

// Hàm fetch an toàn với timeout và JSON parse
async function safeFetch(url, { timeout = 8000 } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
    clearTimeout(id);
    if (!res.ok) {
      // trả về JSON lỗi nếu có, hoặc null
      try {
        const j = await res.json();
        return j;
      } catch (e) {
        return null;
      }
    }
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    console.error('safeFetch error', err);
    return null;
  }
}

// Lấy chi tiết user bằng ID: ưu tiên route by-id, fallback về search?username=
async function fetchUserDetailById(userId) {
  if (!userId) return null;
  // thử gọi /api/user/by-id/:id nếu backend có route này
  const byIdUrl = `${API_BASE}/api/user/by-id/${encodeURIComponent(userId)}`;
  const fallbackUrl = `${API_BASE}/api/user/search?username=${encodeURIComponent(userId)}`;

  let res = await safeFetch(byIdUrl);
  if (res && (res.player || !res.error)) return res;

  // Nếu by-id không tồn tại hoặc trả lỗi, thử fallback
  res = await safeFetch(fallbackUrl);
  return res;
}

function copyId() {
  const idText = document.getElementById("playerId").textContent;
  navigator.clipboard.writeText(idText).then(() => {
    alert("Đã sao chép ID: " + idText);
  }).catch((err) => {
    console.error("Lỗi sao chép:", err);
  });
}

function safeDisplay(val) {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "number" && val === -1) return "Ẩn";
  if (typeof val === "string" && val.trim() === "") return "Không có";
  return val;
}

function renderUserList(users, oldName) {
  const resultBox = document.getElementById("resultBox");
  resultBox.innerHTML = `
    <div class="user-list fade show">
      <h3>Tìm thấy ${users.length} người từng dùng "${oldName}"</h3>
      <ul>
        ${users.map((u, i) => `
          <li style="margin:6px 0;">
            <button class="btn btn-sm btn-primary" data-idx="${i}">
              ${u.username} (ID: ${u.user_id})
            </button>
          </li>
        `).join("")}
      </ul>
    </div>
  `;

  resultBox.querySelectorAll("button[data-idx]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const idx = Number(e.currentTarget.getAttribute("data-idx"));
      const selected = users[idx];

      try {
        const data = await fetchUserDetailById(selected.user_id);
        if (data && data.player) {
          renderCharacterCard(data.player, data.history);
        } else if (data && data.error) {
          alert(data.error);
        } else {
          alert('Không thể lấy chi tiết user.');
        }
      } catch (err) {
        console.error("Lỗi khi lấy chi tiết user:", err);
        alert('Lỗi khi lấy chi tiết user.');
      }
    });
  });
}

function renderCharacterCard(player, history) {
  const resultBox = document.getElementById("resultBox");
  const avatar = player.equippedAvatar?.url || "https://i.imgur.com/M6y0vKQ.png";
  const lastOnline = player.lastOnline
    ? new Date(player.lastOnline).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "N/A";
  const now = new Date();
  const formattedNow = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });

  resultBox.innerHTML = `
    <div class="character-card fade">
      <div class="card-image">
        <img src="${avatar}" class="img-fluid" style="transform: scale(1.15);" alt="${player.username} avatar" />
      </div>
      <div class="card-body">
        <h2 class="card-title py-2">${safeDisplay(player.username)}</h2>

        <div class="card-meta d-flex justify-content-evenly py-2">
          <span class="chip">Level ${safeDisplay(player.level)}</span>
          <span class="chip">${safeDisplay(player.status)}</span>
          <span class="chip">Roses: ${safeDisplay(player.receivedRosesCount || 0)}</span>
        </div>

        <div class="card-details">
          <p><strong>ID:</strong> <span id="playerId">${player.id}</span>
            <button onclick="copyId()" class="copy-btn" title="Sao chép ID"><i class="fa-solid fa-copy"></i></button>
          </p>
          <p><strong>Last Online:</strong> ${lastOnline}</p>
          <p><strong>Ranked Skill:</strong> ${safeDisplay(player.rankedSeasonSkill)}</p>
          <p><strong>Max Skill:</strong> ${safeDisplay(player.rankedSeasonMaxSkill)}</p>
          <p><strong>Old Usernames:</strong>
            <span id="oldUsernamesPreview"></span>
            <button id="toggleOldUsernames" style="padding:3px" class="btn btn-sm btn-secondary ms-2">Xem thêm</button>
          </p>
        </div>

        <div class="card-actions d-flex justify-content-between mt-3">
          <div style="font-size:0.85rem;color:rgba(255,255,255,0.85)">Được cấp: Somedieyoung • ${formattedNow}</div>
        </div>
      </div>
    </div>
  `;

  // Hiệu ứng fade-in
  const card = resultBox.querySelector(".character-card");
  if (card) { void card.offsetWidth; card.classList.add("show"); }

  let rawOld = history?.oldusername || "";
  let oldUsernames = [];

  if (Array.isArray(rawOld)) {
    oldUsernames = rawOld.filter((name) => name.trim());
  } else if (typeof rawOld === "string") {
    oldUsernames = rawOld.split(",").map((name) => name.trim()).filter((name) => name);
  }

  const previewEl = document.getElementById("oldUsernamesPreview");
  const toggleBtn = document.getElementById("toggleOldUsernames");

  if (oldUsernames.length === 0) {
    previewEl.textContent = "Không có";
    toggleBtn.style.display = "none";
  } else {
    let expanded = false;
    const renderPreview = () => {
      if (expanded) {
        previewEl.textContent = oldUsernames.join(", ");
        toggleBtn.textContent = "Thu gọn";
      } else {
        const preview = oldUsernames.slice(0, 3).join(", ");
        previewEl.textContent = oldUsernames.length > 3 ? preview + "…" : preview;
        toggleBtn.textContent = "Xem thêm";
      }
    };
    toggleBtn.addEventListener("click", () => { expanded = !expanded; renderPreview(); });
    renderPreview();
  }
}