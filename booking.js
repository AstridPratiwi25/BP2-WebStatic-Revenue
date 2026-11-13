(() => {
  const endpoint = 'backend/api';
  const roomImages = {
    'Standard Twin': 'photo-1611892440504-42a792e24d32',
    'Standard Double': 'photo-1616594039964-ae9021a400a0',
    'Superior Double': 'photo-1611892440504-42a792e24d32',
    'Deluxe Double': 'photo-1616594039964-ae9021a400a0',
    'Executive Double': 'photo-1618221195710-dd6b41faaea6',
    'Junior Suite Double': 'photo-1618221195710-dd6b41faaea6'
  };
  const modal = document.getElementById('bookingModal');
  const form = document.getElementById('guestBookingForm');
  const notice = document.getElementById('bookingNotice');
  const grid = document.querySelector('.room-grid');
  const roomSelect = document.getElementById('roomType');
  let rooms = [];
  let selectedStay = null;

  const localDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = localDate();
  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(value);
  const nightsBetween = (start, end) => Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
  );
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function api(path, options = {}) {
    const response = await fetch(`${endpoint}/${path}`, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Permintaan belum dapat diproses.');
    return result;
  }

  function populateRoomSelect(selected = '') {
    roomSelect.innerHTML = rooms.map(room =>
      `<option value="${escapeHtml(room.name)}"${room.name === selected ? ' selected' : ''}>${escapeHtml(room.name)}</option>`
    ).join('');
    const searchSelect = document.getElementById('searchRoom');
    const previous = searchSelect.value;
    searchSelect.innerHTML = '<option value="all">Semua kamar</option>' + rooms.map(room =>
      `<option value="${escapeHtml(room.name)}">${escapeHtml(room.name)}</option>`
    ).join('');
    if (rooms.some(room => room.name === previous)) searchSelect.value = previous;
    else searchSelect.value = 'all';
  }

  function renderRooms(filter = 'all', stay = null) {
    const nights = stay ? nightsBetween(stay.checkIn, stay.checkOut) : 0;
    const visibleRooms = rooms.filter(room => filter === 'all' || room.name === filter);
    if (!visibleRooms.length) {
      grid.innerHTML = '<p class="room-empty">Tidak ada tipe kamar aktif untuk pilihan ini.</p>';
      return;
    }
    grid.innerHTML = visibleRooms.map((room, index) => {
      const available = Number(room.available) || 0;
      const image = roomImages[room.name] || roomImages['Superior Double'];
      const soldOut = stay && available < 1;
      return `<article class="room-card${soldOut ? ' sold-out' : ''}" data-room="${escapeHtml(room.name)}">
        <div class="room-photo" role="img" aria-label="Kamar ${escapeHtml(room.name)}" style="background-image:url('https://images.unsplash.com/${image}?auto=format&fit=crop&w=1000&q=80')"></div>
        <div class="room-info">
          <h3>${escapeHtml(room.name.replace(' Double', ''))}</h3>
          <p>${escapeHtml(room.description)}</p>
          <div class="room-meta">
            <span>Maks. ${Number(room.capacity)} tamu · ${available > 0 ? `${available} kamar tersedia` : 'Tidak tersedia'}</span>
            <strong>${money(Number(room.rate))} <small>/ malam</small></strong>
            <button type="button" data-book="${escapeHtml(room.name)}"${soldOut ? ' disabled' : ''}>${soldOut ? 'PENUH' : 'PILIH →'}</button>
          </div>
          ${nights > 0 ? `<p class="stay-price">${nights} malam · total ${money(Number(room.rate) * nights)} per kamar</p>` : ''}
        </div>
      </article>`;
    }).join('');
    grid.querySelectorAll('[data-book]').forEach(button => {
      button.addEventListener('click', () => openBooking(button.dataset.book));
    });
  }

  async function loadRooms(checkIn = '', checkOut = '') {
    const query = new URLSearchParams();
    if (checkIn && checkOut) {
      query.set('check_in', checkIn);
      query.set('check_out', checkOut);
    }
    const result = await api(`rooms.php${query.size ? `?${query}` : ''}`);
    rooms = result.rooms || [];
    populateRoomSelect(roomSelect.value);
    return rooms;
  }

  function updateTotal() {
    const checkIn = document.getElementById('checkin').value;
    const checkOut = document.getElementById('checkout').value;
    const count = Number(document.getElementById('roomsCount').value) || 1;
    const room = rooms.find(item => item.name === roomSelect.value);
    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    document.getElementById('staySummary').textContent = nights > 0
      ? `${nights} malam · ${count} kamar`
      : 'Pilih tanggal menginap';
    document.getElementById('stayTotal').textContent = nights > 0 && room
      ? money(nights * count * Number(room.rate))
      : '—';
  }

  function openBooking(roomName = '') {
    const selected = roomName || document.getElementById('searchRoom').value;
    if (rooms.some(room => room.name === selected)) roomSelect.value = selected;
    const checkIn = document.getElementById('searchCheckin').value;
    const checkOut = document.getElementById('searchCheckout').value;
    if (checkIn) document.getElementById('checkin').value = checkIn;
    if (checkOut) document.getElementById('checkout').value = checkOut;
    document.getElementById('checkout').min = checkIn || today;
    document.getElementById('guestCount').value = document.getElementById('searchGuests').value.split(' ')[0];
    notice.classList.remove('show');
    modal.classList.add('open');
    updateTotal();
    document.getElementById('guestName').focus();
  }

  ['searchCheckin', 'searchCheckout', 'checkin', 'checkout'].forEach(id => {
    document.getElementById(id).min = today;
  });
  document.getElementById('searchCheckin').addEventListener('change', event => {
    document.getElementById('searchCheckout').min = event.target.value || today;
  });
  document.getElementById('searchForm').addEventListener('submit', async event => {
    event.preventDefault();
    const checkIn = document.getElementById('searchCheckin').value;
    const checkOut = document.getElementById('searchCheckout').value;
    const message = document.getElementById('roomSearchMessage');
    if (nightsBetween(checkIn, checkOut) < 1) {
      document.getElementById('searchCheckout').setCustomValidity('Check-out harus setelah check-in.');
      document.getElementById('searchCheckout').reportValidity();
      return;
    }
    document.getElementById('searchCheckout').setCustomValidity('');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'MENCARI…';
    try {
      await loadRooms(checkIn, checkOut);
      selectedStay = { checkIn, checkOut };
      const choice = document.getElementById('searchRoom').value;
      renderRooms(choice === 'all' ? 'all' : choice, selectedStay);
      document.querySelector('#rooms .section-head p').textContent =
        `Pilihan untuk ${nightsBetween(checkIn, checkOut)} malam · ${checkIn} sampai ${checkOut}.`;
      if (message) message.textContent = rooms.some(room => room.available > 0)
        ? 'Ketersediaan terbaru sudah dimuat dari server.'
        : 'Tidak ada kamar tersedia untuk tanggal tersebut.';
      document.getElementById('rooms').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (message) message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Cek kamar';
    }
  });
  document.getElementById('searchRoom').addEventListener('change', () => {
    if (selectedStay) renderRooms(document.getElementById('searchRoom').value, selectedStay);
  });

  ['checkin', 'checkout', 'roomType', 'roomsCount'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateTotal);
  });
  document.getElementById('checkin').addEventListener('change', event => {
    const checkout = document.getElementById('checkout');
    checkout.min = event.target.value || today;
    if (checkout.value && checkout.value <= event.target.value) checkout.value = '';
    updateTotal();
  });

  document.querySelectorAll('.nav-cta, .hero .button, .experience .button').forEach(link => {
    link.addEventListener('click', event => {
      if (link.getAttribute('href') === '#booking') {
        event.preventDefault();
        openBooking();
      }
    });
  });
  document.querySelectorAll('.close, .close-action').forEach(button => {
    button.addEventListener('click', () => modal.classList.remove('open'));
  });
  modal.addEventListener('click', event => { if (event.target === modal) modal.classList.remove('open'); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') modal.classList.remove('open'); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (document.getElementById('companyWebsite').value.trim()) return;
    const checkInDate = document.getElementById('checkin').value;
    const checkOutDate = document.getElementById('checkout').value;
    if (nightsBetween(checkInDate, checkOutDate) < 1) {
      document.getElementById('checkout').setCustomValidity('Check-out harus setelah check-in.');
      document.getElementById('checkout').reportValidity();
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'MENGIRIM…';
    notice.classList.remove('show');
    try {
      const result = await api('reservations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: document.getElementById('guestName').value.trim(),
          email: document.getElementById('guestEmail').value.trim(),
          phone: document.getElementById('guestPhone').value.trim(),
          room: roomSelect.value,
          rooms: Number(document.getElementById('roomsCount').value),
          guests: Number(document.getElementById('guestCount').value),
          checkInDate,
          checkOutDate,
          website: document.getElementById('companyWebsite').value.trim()
        })
      });
      notice.textContent = `Permintaan booking ${result.id} sudah diterima. Statusnya menunggu konfirmasi dari properti.`;
      notice.classList.add('show');
      form.reset();
      document.getElementById('checkout').min = today;
      updateTotal();
    } catch (error) {
      notice.textContent = error.message || 'Booking gagal dikirim. Silakan coba kembali.';
      notice.classList.add('show');
    } finally {
      button.disabled = false;
      button.textContent = 'Kirim permintaan';
    }
  });

  loadRooms().then(() => renderRooms()).catch(error => {
    grid.innerHTML = `<p class="room-empty">${escapeHtml(error.message)} Muat ulang halaman atau hubungi properti.</p>`;
    document.querySelector('#rooms .section-head p').textContent = 'Kamar sedang tidak dapat dimuat.';
  });
})();
