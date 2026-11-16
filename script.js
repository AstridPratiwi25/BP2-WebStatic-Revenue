
// ==========================================
// VILLA & SANCTUARY BY ASTRID
// HOTEL REVENUE MANAGEMENT SYSTEM
// ==========================================


// 1. REFERENCE DATA
const ROOM_TYPES = [
    "Standard Twin",
    "Standard Double",
    "Superior Double",
    "Deluxe Double",
    "Executive Double",
    "Junior Suite Double"
];
const REVENUE_STATUSES = new Set(["confirmed", "checked-in", "checked-out"]);

function normalizeRoomType(roomType) {
    if (ROOM_TYPES.includes(roomType)) {
        return roomType;
    }

    const normalized = String(roomType || "").toLowerCase();
    if (normalized.includes("junior") || normalized.includes("presidential")) {
        return "Junior Suite Double";
    }
    if (normalized.includes("executive")) {
        return "Executive Double";
    }
    if (normalized.includes("deluxe")) {
        return "Deluxe Double";
    }
    if (normalized.includes("superior")) {
        return "Superior Double";
    }
    if (normalized.includes("twin")) {
        return "Standard Twin";
    }

    return "Standard Double";
}

function getDepartureDate(checkInDate, nights) {
    const stayNights = Number(nights);
    if (!checkInDate || !Number.isInteger(stayNights) || stayNights < 1) {
        return "";
    }

    const arrival = new Date(`${checkInDate}T00:00:00Z`);
    if (Number.isNaN(arrival.getTime())) {
        return "";
    }

    arrival.setUTCDate(arrival.getUTCDate() + stayNights);
    return arrival.toISOString().slice(0, 10);
}

let bookingData = [];
let adminCsrfToken = "";
let operationsData = { rooms: [], roomTypes: [], settings: {} };

async function adminApiRequest(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = { "Accept": "application/json", ...(options.headers || {}) };
    if (method !== "GET" && method !== "HEAD") headers["X-CSRF-Token"] = adminCsrfToken;
    const response = await fetch(url, { ...options, method, headers, credentials: "same-origin", cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
        const gate = getElement("adminGate");
        if (gate) gate.hidden = false;
        adminCsrfToken = "";
    }
    if (!response.ok) throw new Error(result.error || "Permintaan ke server gagal.");
    return result;
}

async function initializeAdminAccess() {
    const gate = getElement("adminGate");
    const loginForm = getElement("adminLoginForm");
    const message = getElement("adminLoginError");
    const button = getElement("adminLoginButton");
    const logoutButton = getElement("btnAdminLogout");
    const showError = error => { if (message) message.textContent = error.message || "Tidak dapat terhubung ke server."; };

    const loadSession = async () => {
        const response = await fetch("backend/api/auth.php", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Layanan login belum siap.");
        if (!result.authenticated) {
            if (gate) gate.hidden = false;
            return false;
        }
        adminCsrfToken = result.csrfToken;
        if (gate) gate.hidden = true;
        if (message) message.textContent = "";
        return true;
    };

    try {
        if (await loadSession()) {
            await refreshReservationsFromServer();
            await refreshOperationsFromServer();
        }
    } catch (error) {
        if (gate) gate.hidden = false;
        showError(error);
    }

    loginForm?.addEventListener("submit", async event => {
        event.preventDefault();
        if (!loginForm.reportValidity()) return;
        if (button) button.disabled = true;
        if (message) message.textContent = "Memeriksa akun…";
        try {
            const response = await fetch("backend/api/auth.php", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                    username: getElement("adminUsername").value.trim(),
                    password: getElement("adminPassword").value
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Login gagal.");
            adminCsrfToken = result.csrfToken;
            getElement("adminPassword").value = "";
            if (gate) gate.hidden = true;
            if (message) message.textContent = "";
            await refreshReservationsFromServer();
            await refreshOperationsFromServer();
        } catch (error) {
            showError(error);
        } finally {
            if (button) button.disabled = false;
        }
    });

    logoutButton?.addEventListener("click", async () => {
        try {
            await adminApiRequest("backend/api/auth.php", { method: "DELETE" });
        } catch (_) {
            // The gate still closes access locally if the session already expired.
        }
        adminCsrfToken = "";
        if (gate) gate.hidden = false;
        getElement("adminPassword")?.focus();
    });
}

async function refreshReservationsFromServer({ renderFeatures = true } = {}) {
    const result = await adminApiRequest("backend/api/reservations.php");
    if (!Array.isArray(result.reservations)) throw new Error("Data reservasi dari server tidak valid.");

    bookingData = result.reservations.map(item => ({
        ...item,
        room: normalizeRoomType(item.room),
        rooms: Number(item.rooms) || 1,
        nights: Number(item.nights) || 1,
        price: Number(item.price) || 0,
        rate: Number(item.rate) || 0,
        otaClass: item.otaClass || ""
    }));
    renderAllPages();
    if (renderFeatures) renderHotelFeatures();
}

async function refreshOperationsFromServer() {
    const result = await adminApiRequest("backend/api/operations.php");
    operationsData = {
        rooms: Array.isArray(result.rooms) ? result.rooms : [],
        roomTypes: Array.isArray(result.roomTypes) ? result.roomTypes : [],
        settings: result.settings || {}
    };
    renderHotelFeatures();
}

// 2. HELPER FUNCTIONS

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(number);
}

function getElement(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// 3. GLOBAL DASHBOARD FILTER

function getFilteredBookings() {
    const channel = getElement("globalChannelFilter")?.value || "all";
    const dateDimension = getElement("dateDimensionFilter")?.value || "bookingDate";
    const startDate = getElement("startDateFilter")?.value || "";
    const endDate = getElement("endDateFilter")?.value || "";

    return bookingData.filter(booking => {
        const matchesChannel =
            channel === "all" || booking.channel === channel;

        const selectedDate = booking[dateDimension];

        const matchesStartDate =
            !startDate || selectedDate >= startDate;

        const matchesEndDate =
            !endDate || selectedDate <= endDate;

        return (
            matchesChannel &&
            matchesStartDate &&
            matchesEndDate
        );
    });
}


// 4. RENDER MAIN DASHBOARD

function renderAllPages() {
    const filteredBookings = getFilteredBookings();

    let totalRevenue = 0;
    let totalNights = 0;
    let confirmedCount = 0;

    let cancelledCount = 0;
    let pendingCount = 0;

    const channelStats = {};
    const roomStats = {};

    // Calculate booking statistics
    filteredBookings.forEach(item => {
        const roomCount = Number(item.rooms) || 1;

        if (item.status === "cancelled") {
            cancelledCount++;
            return;
        }

        if (item.status === "pending") {
            pendingCount++;
            return;
        }

        if (!REVENUE_STATUSES.has(item.status)) return;

        totalRevenue += item.price;
        totalNights += item.nights * roomCount;
        confirmedCount++;

        // Channel statistics
        if (!channelStats[item.channel]) {
            channelStats[item.channel] = {
                count: 0,
                rooms: 0,
                nights: 0,
                revenue: 0
            };
        }

        channelStats[item.channel].count++;
        channelStats[item.channel].rooms += roomCount;
        channelStats[item.channel].nights += item.nights * roomCount;
        channelStats[item.channel].revenue += item.price;

        // Room statistics
        if (!roomStats[item.room]) {
            roomStats[item.room] = {
                count: 0,
                bookings: 0,
                nights: 0,
                revenue: 0
            };
        }

        roomStats[item.room].count += roomCount;
        roomStats[item.room].bookings++;
        roomStats[item.room].nights += item.nights * roomCount;
        roomStats[item.room].revenue += item.price;
    });


    // Calculate KPIs
    const adr = totalNights > 0
        ? totalRevenue / totalNights
        : 0;

    const cancellationRate = filteredBookings.length > 0
        ? (cancelledCount / filteredBookings.length) * 100
        : 0;


    // 5. OVERVIEW TABLE

    const overviewBody = getElement("bookingTableBody");

    if (overviewBody) {
        overviewBody.innerHTML = "";

        if (filteredBookings.length === 0) {
            overviewBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        No reservations found.
                    </td>
                </tr>
            `;
        } else {
            filteredBookings.forEach(item => {
                overviewBody.innerHTML += `
                    <tr>
                        <td><strong>${item.id}</strong></td>
                        <td>
                            <span class="channel-badge ${item.otaClass}">
                                ${escapeHtml(item.channel)}
                            </span>
                        </td>
                        <td>${escapeHtml(item.room)}</td>
                        <td>${Number(item.rooms) || 1}</td>
                        <td>${item.nights} Nights</td>
                        <td>${formatRupiah(item.price)}</td>
                        <td>
                            <span class="badge ${item.status}">
                                ${item.status.toUpperCase()}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }
    }


    // 6. TOP PERFORMING CHANNEL

    let topChannelName = "-";
    let maxRevenue = 0;

    Object.entries(channelStats).forEach(([channel, data]) => {
        if (data.revenue > maxRevenue) {
            maxRevenue = data.revenue;
            topChannelName = channel;
        }
    });


    // 7. UPDATE KPI CARDS

    const revenueEl = getElement("totalRevenue");
    const nightsEl = getElement("roomNights");
    const adrEl = getElement("adrValue");
    const topChannelEl = getElement("topChannel");

    if (revenueEl) {
        revenueEl.innerText = formatRupiah(totalRevenue);
    }

    if (nightsEl) {
        nightsEl.innerText = totalNights + " Room Nights";
    }

    if (adrEl) {
        adrEl.innerText = formatRupiah(adr);
    }

    if (topChannelEl) {
        topChannelEl.innerText = topChannelName;
    }


    // 8. OTA BREAKDOWN

    const otaBody = getElement("otaBreakdownBody");

    if (otaBody) {
        otaBody.innerHTML = "";

        const channels = Object.entries(channelStats);

        if (channels.length === 0) {
            otaBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No confirmed booking data available.
                    </td>
                </tr>
            `;
        } else {
            channels.forEach(([channel, data]) => {

                const contribution = totalRevenue > 0
                    ? (data.revenue / totalRevenue) * 100
                    : 0;

                // Demo assumption: 15% commission
                const commission = data.revenue * 0.15;

                otaBody.innerHTML += `
                    <tr>
                        <td><strong>${channel}</strong></td>
                        <td>${data.count} Bookings (${data.rooms} Rooms)</td>
                        <td>${data.nights} Nights</td>
                        <td>${formatRupiah(data.revenue)}</td>
                        <td>${formatRupiah(commission)}</td>
                        <td><strong>${contribution.toFixed(1)}%</strong></td>
                    </tr>
                `;
            });
        }
    }


    // 9. ROOM TYPE ANALYTICS

    const roomBody = getElement("roomTypeAnalyticsBody");

    if (roomBody) {
        roomBody.innerHTML = "";

        const rooms = Object.entries(roomStats);

        if (rooms.length === 0) {
            roomBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        No confirmed room data available.
                    </td>
                </tr>
            `;
        } else {
            rooms.forEach(([room, data]) => {

                const roomADR = data.nights > 0
                    ? data.revenue / data.nights
                    : 0;

                roomBody.innerHTML += `
                    <tr>
                        <td><strong>${room}</strong></td>
                        <td>${data.count} Rooms (${data.bookings} Bookings, ${data.nights} Room Nights)</td>
                        <td>${formatRupiah(data.revenue)}</td>
                        <td>${formatRupiah(roomADR)}</td>
                    </tr>
                `;
            });
        }
    }


    // 10. REVPAR

    const revparEl = getElement("revparValue");

    if (revparEl) {
        revparEl.innerText = "N/A";
        revparEl.title =
            "Room inventory data is required to calculate actual RevPAR.";
    }


    // 11. OPTIONAL ADDITIONAL KPI ELEMENTS
    // These update automatically if the elements are added to HTML.

    const bookingCountEl = getElement("bookingCountValue");
    const cancellationCountEl = getElement("cancellationCountValue");
    const cancellationRateEl = getElement("cancellationRateValue");
    const pendingCountEl = getElement("pendingCountValue");

    if (bookingCountEl) {
        bookingCountEl.innerText = confirmedCount;
    }

    if (cancellationCountEl) {
        cancellationCountEl.innerText = cancelledCount;
    }

    if (cancellationRateEl) {
        cancellationRateEl.innerText =
            cancellationRate.toFixed(1) + "%";
    }

    if (pendingCountEl) {
        pendingCountEl.innerText = pendingCount;
    }


    // 12. RESERVATIONS TABLE

    renderReservations();
}


// 13. RESERVATION SEARCH & FILTER

function renderReservations() {

    const resBody = getElement("allReservationsBody");

    if (!resBody) return;

    const searchInput = getElement("searchReservation");
    const channelFilter = getElement("filterChannel");
    const statusFilter = getElement("filterStatus");

    const keyword = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const selectedChannel = channelFilter
        ? channelFilter.value
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "";

    // Apply global filter first
    const filteredData = getFilteredBookings().filter(item => {

        const matchesSearch =
            item.id.toLowerCase().includes(keyword) ||
            item.guest.toLowerCase().includes(keyword);

        const matchesChannel =
            !selectedChannel || item.channel === selectedChannel;

        const matchesStatus =
            !selectedStatus || item.status === selectedStatus;

        return (
            matchesSearch &&
            matchesChannel &&
            matchesStatus
        );
    });

    resBody.innerHTML = "";

    if (filteredData.length === 0) {
        resBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    No reservations found.
                </td>
            </tr>
        `;
        return;
    }

    filteredData.forEach(item => {
        resBody.innerHTML += `
            <tr>
                <td><strong>${item.id}</strong></td>
                <td>${escapeHtml(item.guest)}</td>
                <td>
                    <span class="channel-badge ${item.otaClass}">
                        ${escapeHtml(item.channel)}
                    </span>
                </td>
                <td>${escapeHtml(item.room)}</td>
                <td>${Number(item.rooms) || 1}</td>
                <td>${item.checkInDate || "-"}</td>
                <td>${item.departureDate || "-"}</td>
                <td>${item.nights} Nights</td>
                <td>${formatRupiah(item.rate ?? (item.price / item.nights))}</td>
                <td>${formatRupiah(item.price)}</td>
                <td>
                    <span class="badge ${item.status}">
                        ${item.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-primary btn-view-reservation"
                        data-reservation-id="${escapeHtml(item.id)}">
                        View
                    </button>
                </td>
            </tr>
        `;
    });
}


// 14. RESET RESERVATION SEARCH FILTERS

function resetReservationFilters() {
    const searchInput = getElement("searchReservation");
    const channelFilter = getElement("filterChannel");
    const statusFilter = getElement("filterStatus");

    if (searchInput) searchInput.value = "";
    if (channelFilter) channelFilter.value = "";
    if (statusFilter) statusFilter.value = "";

    renderReservations();
}


// 15. GLOBAL FILTER EVENTS

function setupGlobalFilters() {

    const applyButton = getElement("applyGlobalFilter");
    const resetButton = getElement("resetGlobalFilter");

    const startDate = getElement("startDateFilter");
    const endDate = getElement("endDateFilter");

    if (applyButton) {
        applyButton.addEventListener("click", () => {

            if (
                startDate &&
                endDate &&
                startDate.value &&
                endDate.value &&
                startDate.value > endDate.value
            ) {
                alert("Start Date cannot be later than End Date.");
                return;
            }

            renderAllPages();
        });
    }

    if (resetButton) {
        resetButton.addEventListener("click", () => {

            const channel = getElement("globalChannelFilter");
            const dimension = getElement("dateDimensionFilter");
            const granularity = getElement("granularityFilter");

            if (channel) channel.value = "all";
            if (dimension) dimension.value = "bookingDate";
            if (startDate) startDate.value = "";
            if (endDate) endDate.value = "";
            if (granularity) granularity.value = "all";

            renderAllPages();
        });
    }
}


// 16. MOBILE SIDEBAR

function setupMobileSidebar() {

    const sidebar = getElement("sidebar");
    const overlay = getElement("sidebarOverlay");
    const mobileToggleBtn = getElement("mobileToggleBtn");
    const closeSidebarBtn = getElement("closeSidebarBtn");

    function openSidebar() {
        if (sidebar) sidebar.classList.add("show");
        if (overlay) overlay.classList.add("active");
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove("show");
        if (overlay) overlay.classList.remove("active");
    }

    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener("click", openSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    return closeSidebar;
}


// 17. INITIALIZE DASHBOARD

// Operational pages use the authenticated server data as their source of truth.
const FEATURE_CHANNELS = ["Traveloka", "Tiket.com", "Agoda", "Booking.com", "Expedia", "Trip.com", "Direct Website"];

function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function featureEmptyRow(columns, message = "Belum ada data.") {
    return `<tr><td colspan="${columns}" class="text-center text-muted py-3">${message}</td></tr>`;
}

function renderHotelFeatures() {
    const confirmed = bookingData.filter(item => REVENUE_STATUSES.has(item.status));
    const arrivalsBody = getElement("arrivalsBody");
    const departuresBody = getElement("departuresBody");
    const today = localToday();
    const renderTurnover = (body, rows, actionLabel, actionStatus) => {
        if (!body) return;
        body.innerHTML = rows.length ? rows.map(item => `<tr><td><strong>${escapeHtml(item.guest)}</strong><div class="small text-muted">${escapeHtml(item.id)}</div></td><td>${escapeHtml(item.room)} · ${Number(item.rooms) || 1}</td><td><span class="badge bg-secondary">${escapeHtml(item.status)}</span></td><td><button class="btn btn-sm btn-outline-primary" data-turnover="${escapeHtml(item.id)}" data-turnover-status="${actionStatus}">${actionLabel}</button></td></tr>`).join("") : featureEmptyRow(4, "Tidak ada jadwal untuk hari ini." );
    };
    renderTurnover(arrivalsBody, bookingData.filter(item => item.status === "confirmed" && item.checkInDate === today), "Check-in", "checked-in");
    renderTurnover(departuresBody, bookingData.filter(item => item.status === "checked-in" && (item.departureDate || getDepartureDate(item.checkInDate, item.nights)) === today), "Check-out", "checked-out");

    const guestSearch = getElement("guestSearch")?.value.trim().toLowerCase() || "";
    const guests = new Map();
    bookingData.forEach(item => {
        const key = item.guest.trim().toLowerCase();
        if (!key) return;
        const entry = guests.get(key) || { guest: item.guest, bookings: 0, channel: item.channel, spend: 0, lastDate: "" };
        entry.bookings++;
        entry.channel = item.channel;
        if (REVENUE_STATUSES.has(item.status)) entry.spend += Number(item.price) || 0;
        entry.lastDate = [entry.lastDate, item.bookingDate || ""].sort().pop();
        guests.set(key, entry);
    });
    const guestRows = [...guests.values()].filter(g => `${g.guest} ${g.channel}`.toLowerCase().includes(guestSearch)).sort((a, b) => a.guest.localeCompare(b.guest));
    const guestBody = getElement("guestDirectoryBody");
    if (guestBody) guestBody.innerHTML = guestRows.length ? guestRows.map(g => `<tr><td><strong>${escapeHtml(g.guest)}</strong></td><td>${g.bookings} booking</td><td>${escapeHtml(g.channel)}</td><td>${escapeHtml(g.lastDate || "-")}</td><td>${formatRupiah(g.spend)}</td></tr>`).join("") : featureEmptyRow(5, "Tamu tidak ditemukan.");

    const inventory = operationsData.rooms.map(room => ({
        number: room.room_number, type: room.room_type, capacity: Number(room.capacity),
        operationalStatus: room.operational_status,
        status: room.operational_status === "Active" ? "Aktif" : room.operational_status === "Maintenance" ? "Perbaikan" : "Nonaktif",
        housekeepingStatus: room.housekeeping_status, housekeepingNote: room.housekeeping_note
    }));
    const housekeepingBody = getElement("housekeepingBody");
    if (housekeepingBody) housekeepingBody.innerHTML = inventory.map(room => {
        return `<tr><td><strong>${escapeHtml(room.number)}</strong></td><td>${escapeHtml(room.type)}</td><td><select class="form-select form-select-sm housekeeping-status" data-room="${escapeHtml(room.number)}"><option value="Clean"${room.housekeepingStatus === "Clean" ? " selected" : ""}>Bersih</option><option value="Needs cleaning"${room.housekeepingStatus === "Needs cleaning" ? " selected" : ""}>Perlu dibersihkan</option><option value="In progress"${room.housekeepingStatus === "In progress" ? " selected" : ""}>Sedang dibersihkan</option><option value="Inspection"${room.housekeepingStatus === "Inspection" ? " selected" : ""}>Perlu diperiksa</option></select></td><td><input class="form-control form-control-sm housekeeping-note" data-room="${escapeHtml(room.number)}" value="${escapeHtml(room.housekeepingNote)}" placeholder="Catatan"></td><td><span class="small text-muted">${escapeHtml(room.status)}</span></td></tr>`;
    }).join("");
    const inventoryBody = getElement("inventoryBody");
    if (inventoryBody) inventoryBody.innerHTML = inventory.map(room => `<tr><td>${escapeHtml(room.number)}</td><td>${escapeHtml(room.type)}</td><td>${Number(room.capacity)} orang</td><td><select class="form-select form-select-sm inventory-status" data-room="${escapeHtml(room.number)}"><option value="Active"${room.operationalStatus === "Active" ? " selected" : ""}>Aktif</option><option value="Maintenance"${room.operationalStatus === "Maintenance" ? " selected" : ""}>Perbaikan</option><option value="Inactive"${room.operationalStatus === "Inactive" ? " selected" : ""}>Nonaktif</option></select></td><td></td></tr>`).join("") || featureEmptyRow(5);

    const ratesBody = getElement("ratesBody");
    const rateStats = {};
    confirmed.forEach(item => { const stats = rateStats[item.room] || { nights: 0, revenue: 0 }; stats.nights += (Number(item.nights) || 0) * (Number(item.rooms) || 1); stats.revenue += Number(item.price) || 0; rateStats[item.room] = stats; });
    if (ratesBody) ratesBody.innerHTML = operationsData.roomTypes.map(type => `<tr><td>${escapeHtml(type.room_type)}</td><td><input class="form-control form-control-sm room-rate" data-type="${escapeHtml(type.room_type)}" type="number" min="0" step="10000" value="${Number(type.base_rate)}" placeholder="Atur tarif"></td><td>${rateStats[type.room_type]?.nights || 0}</td><td>${formatRupiah(rateStats[type.room_type]?.revenue || 0)}</td></tr>`).join("") || featureEmptyRow(4, "Tipe kamar belum tersedia.");

    const channelBody = getElement("channelManagerBody");
    if (channelBody) channelBody.innerHTML = FEATURE_CHANNELS.map(channel => {
        const count = bookingData.filter(item => item.channel === channel).length;
        return `<tr><td><strong>${escapeHtml(channel)}</strong></td><td><span class="badge bg-secondary">${channel === "Direct Website" ? "Terhubung" : "Belum terhubung"}</span></td><td>${count} booking database</td><td>-</td></tr>`;
    }).join("");

    const financeBody = getElement("financeBody");
    const commissionRate = Number(operationsData.settings.ota_commission_percent ?? 15);
    const revenue = confirmed.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    if (getElement("financeRevenue")) getElement("financeRevenue").textContent = formatRupiah(revenue);
    if (getElement("financeCommission")) getElement("financeCommission").textContent = formatRupiah(confirmed.filter(item => item.channel !== "Direct Website").reduce((sum, item) => sum + (Number(item.price) || 0), 0) * commissionRate / 100);
    if (getElement("financeNet")) getElement("financeNet").textContent = formatRupiah(revenue - confirmed.filter(item => item.channel !== "Direct Website").reduce((sum, item) => sum + (Number(item.price) || 0), 0) * commissionRate / 100);
    if (financeBody) financeBody.innerHTML = confirmed.length ? confirmed.map(item => `<tr><td>${escapeHtml(item.bookingDate || "-")}</td><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.guest)}</td><td>${escapeHtml(item.channel)}</td><td>${formatRupiah(item.price)}</td></tr>`).join("") : featureEmptyRow(5);

    const counters = { reportBookings: bookingData.length, reportConfirmed: confirmed.length, reportCancelled: bookingData.filter(item => item.status === "cancelled").length, reportRevenue: formatRupiah(revenue) };
    Object.entries(counters).forEach(([id, value]) => { if (getElement(id)) getElement(id).textContent = value; });

    const hotelName = getElement("hotelNameSetting");
    const propertyName = operationsData.settings.property_name || "Villa & Sanctuary by Astrid";
    if (hotelName && document.activeElement !== hotelName) hotelName.value = propertyName;
    const brandName = document.querySelector(".brand-title h5");
    if (brandName) brandName.textContent = propertyName;
    const tax = getElement("taxSetting"); if (tax && document.activeElement !== tax) tax.value = operationsData.settings.tax_percent ?? 11;
    const commission = getElement("commissionSetting"); if (commission && document.activeElement !== commission) commission.value = commissionRate;

    renderPlanner(inventory);
}

function renderPlanner(inventory) {
    const input = getElement("plannerDate");
    if (!input) return;
    if (!input.value) input.value = localToday().slice(0, 7);
    const [year, month] = input.value.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const head = getElement("plannerHead");
    const body = getElement("plannerBody");
    if (!head || !body) return;
    head.innerHTML = `<tr><th>Kamar</th>${Array.from({ length: days }, (_, i) => `<th class="text-center">${i + 1}</th>`).join("")}</tr>`;
    body.innerHTML = inventory.map(room => `<tr><th class="text-nowrap">${escapeHtml(room.number)}<div class="small text-muted fw-normal">${escapeHtml(room.type)}</div></th>${Array.from({ length: days }, (_, i) => {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        const booking = bookingData.find(item => ["pending", "confirmed", "checked-in"].includes(item.status) && item.room === room.type && date >= item.checkInDate && date < (item.departureDate || getDepartureDate(item.checkInDate, item.nights)));
        return `<td class="planner-day ${booking ? "bg-primary-subtle" : ""}" title="${booking ? escapeHtml(booking.guest) + " Â· " + escapeHtml(booking.id) : "Tersedia"}">${booking ? "â—" : ""}</td>`;
    }).join("")}</tr>`).join("");
}

function setupHotelFeatures() {
    renderHotelFeatures();
    getElement("guestSearch")?.addEventListener("input", renderHotelFeatures);
    getElement("plannerDate")?.addEventListener("change", renderHotelFeatures);
    document.addEventListener("change", event => {
        const room = operationsData.rooms.find(value => value.room_number === event.target.dataset.room);
        if (event.target.matches(".housekeeping-status") && room) saveRoomStatus(room, room.operational_status, event.target.value);
        if (event.target.matches(".housekeeping-note") && room) saveRoomStatus(room, room.operational_status, room.housekeeping_status, event.target.value);
        if (event.target.matches(".inventory-status") && room) saveRoomStatus(room, event.target.value, room.housekeeping_status);
        if (event.target.matches(".room-rate")) {
            const type = operationsData.roomTypes.find(value => value.room_type === event.target.dataset.type);
            if (type) adminApiRequest("backend/api/rooms.php", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: type.room_type, rate: Number(event.target.value), capacity: Number(type.max_guests), active: Boolean(Number(type.is_active)) }) }).then(refreshOperationsFromServer).catch(error => alert(error.message));
        }
    });
    document.addEventListener("click", event => {
        const turnover = event.target.closest("[data-turnover]");
        if (turnover) {
            const item = bookingData.find(value => value.id === turnover.dataset.turnover);
            if (item) updateReservationStatus(item, turnover.dataset.turnoverStatus);
        }
        if (event.target.closest("#addInventoryRoom")) {
            const number = prompt("Nomor kamar baru:"); if (!number?.trim()) return;
            const choices = operationsData.roomTypes.filter(value => Number(value.is_active)).map(value => value.room_type);
            const type = prompt(`Tipe kamar (${choices.join(", ")}):`, choices[0]); if (!type || !choices.includes(type)) { alert("Pilih tipe kamar yang tersedia."); return; }
            adminApiRequest("backend/api/operations.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-room", roomNumber: number.trim(), roomType: type }) }).then(refreshOperationsFromServer).catch(error => alert(error.message));
        }
        if (event.target.closest("#syncChannels") && getElement("syncMessage")) getElement("syncMessage").textContent = "Sinkronisasi OTA langsung belum tersedia. Reservasi Direct Website tersimpan di database.";
        if (event.target.closest("#exportBookings")) exportReservationsCsv();
    });
    getElement("settingsForm")?.addEventListener("submit", event => {
        event.preventDefault();
        adminApiRequest("backend/api/operations.php", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "settings", propertyName: getElement("hotelNameSetting").value.trim(), tax: Number(getElement("taxSetting").value), commission: Number(getElement("commissionSetting").value) }) })
            .then(async () => { if (getElement("settingsMessage")) getElement("settingsMessage").textContent = "Pengaturan tersimpan ke database."; await refreshOperationsFromServer(); })
            .catch(error => { if (getElement("settingsMessage")) getElement("settingsMessage").textContent = error.message; });
    });
    getElement("allReservationsBody")?.addEventListener("click", event => { if (event.target.closest(".btn-view-reservation")) setTimeout(renderHotelFeatures, 0); });
}

async function saveRoomStatus(room, operationalStatus, housekeepingStatus, housekeepingNote = room.housekeeping_note) {
    try {
        await adminApiRequest("backend/api/operations.php", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "room-status", roomNumber: room.room_number, operationalStatus, housekeepingStatus, housekeepingNote }) });
        await refreshOperationsFromServer();
    } catch (error) { alert(error.message); await refreshOperationsFromServer(); }
}

async function updateReservationStatus(item, status) {
    try {
        await adminApiRequest("backend/api/reservations.php", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, guest: item.guest, email: item.email || "", phone: item.phone || "", guests: item.guests || 1, channel: item.channel, room: item.room, rooms: item.rooms, rate: item.rate, checkInDate: item.checkInDate, departureDate: item.departureDate, status }) });
        await refreshReservationsFromServer();
    } catch (error) { alert(error.message); }
}

function exportReservationsCsv() {
    const columns = ["id", "guest", "email", "phone", "guests", "channel", "room", "rooms", "checkInDate", "departureDate", "nights", "price", "status"];
    const quote = value => {
        const text = String(value ?? "");
        const safe = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = [columns.join(","), ...bookingData.map(item => columns.map(key => quote(item[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "reservations.csv"; link.click(); URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {

    // Initial dashboard rendering
    renderAllPages();
    setupHotelFeatures();
    initializeAdminAccess();
    window.addEventListener("focus", () => {
        if (adminCsrfToken) {
            const editingOperations = document.activeElement?.matches(
                ".housekeeping-status, .housekeeping-note, .inventory-status, .room-rate, #hotelNameSetting, #taxSetting, #commissionSetting"
            );
            refreshReservationsFromServer({ renderFeatures: !editingOperations }).catch(() => {});
            if (!editingOperations) refreshOperationsFromServer().catch(() => {});
        }
    });
    window.setInterval(() => {
        if (!document.hidden && adminCsrfToken) {
            refreshReservationsFromServer({ renderFeatures: false }).catch(() => {});
        }
    }, 30000);

    // Global dashboard filters
    setupGlobalFilters();


    // Reservation search and filters
    const searchReservation = getElement("searchReservation");
    const filterChannel = getElement("filterChannel");
    const filterStatus = getElement("filterStatus");
    const resetFilter = getElement("resetFilter");

    if (searchReservation) {
        searchReservation.addEventListener("input", renderReservations);
    }

    if (filterChannel) {
        filterChannel.addEventListener("change", renderReservations);
    }

    if (filterStatus) {
        filterStatus.addEventListener("change", renderReservations);
    }

    if (resetFilter) {
        resetFilter.addEventListener("click", resetReservationFilters);
    }

    setupReservationForm();
    setupReservationDetails();

    // Mobile sidebar
    const closeSidebar = setupMobileSidebar();


    // Navigation menu
    const navItems = document.querySelectorAll(".nav-item");
    const contentSections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            navItems.forEach(nav => {
                const link = nav.querySelector(".nav-link");
                if (link) link.classList.remove("active");
            });

            contentSections.forEach(section => {
                section.classList.add("d-none");
            });

            const currentLink = item.querySelector(".nav-link");

            if (currentLink) {
                currentLink.classList.add("active");
            }

            const targetId = item.getAttribute("data-target");
            const targetSection = getElement(targetId);

            if (targetSection) {
                targetSection.classList.remove("d-none");
            }

            const pageTitle = getElement("pageTitle");
            if (pageTitle) {
                pageTitle.textContent = item.getAttribute("data-title") || currentLink?.textContent.trim() || "Hotel Management";
            }

            const showDashboardControls = [
                "overviewSection",
                "otaBreakdownSection",
                "reservationsSection",
                "roomAnalyticsSection"
            ].includes(targetId);
            const dashboardFilters = getElement("dashboardFilters");
            const dashboardMetrics = getElement("dashboardMetrics");

            if (dashboardFilters) {
                dashboardFilters.classList.toggle("d-none", !showDashboardControls);
            }
            if (dashboardMetrics) {
                dashboardMetrics.classList.toggle("d-none", !showDashboardControls);
            }

            if (closeSidebar) {
                closeSidebar();
            }
        });
    });


    // OTA sync demonstration
    const btnRefresh = getElement("btnRefresh");

    if (btnRefresh) {
        btnRefresh.addEventListener("click", async () => {
            try {
                await refreshReservationsFromServer();
                alert("Data reservasi berhasil diperbarui dari server.");
            } catch (error) {
                alert(error.message || "Data reservasi belum dapat diperbarui.");
            }
        });
    }

});

function setupReservationForm() {
    const form = getElement("reservationForm");
    const arrivalDate = getElement("arrivalDate");
    const departureDate = getElement("departureDate");
    const nightsInput = getElement("bookingNights");
    const rateInput = getElement("bookingRate");
    const roomsInput = getElement("bookingRooms");
    const totalAmountInput = getElement("bookingTotalAmount");

    if (!form || !arrivalDate || !departureDate || !nightsInput || !rateInput || !roomsInput || !totalAmountInput) {
        return;
    }

    function updateTotalAmount() {
        const nights = Number(nightsInput.value);
        const rate = Number(rateInput.value);
        const rooms = Number(roomsInput.value);

        totalAmountInput.value = nights > 0 && rate >= 0 && rooms > 0
            ? String(rate * nights * rooms)
            : "";
    }

    function updateDuration() {
        const arrival = arrivalDate.value;
        const departure = departureDate.value;
        departureDate.min = arrival;

        if (!arrival || !departure) {
            nightsInput.value = "";
            departureDate.setCustomValidity("");
            updateTotalAmount();
            return;
        }

        const arrivalUtc = Date.parse(`${arrival}T00:00:00Z`);
        const departureUtc = Date.parse(`${departure}T00:00:00Z`);
        const nights = (departureUtc - arrivalUtc) / 86400000;

        if (nights < 1) {
            nightsInput.value = "";
            departureDate.setCustomValidity("Departure date must be after arrival date.");
            updateTotalAmount();
            return;
        }

        departureDate.setCustomValidity("");
        nightsInput.value = nights;
        updateTotalAmount();
    }

    arrivalDate.addEventListener("change", updateDuration);
    departureDate.addEventListener("change", updateDuration);
    rateInput.addEventListener("input", updateTotalAmount);
    roomsInput.addEventListener("input", updateTotalAmount);

    form.addEventListener("submit", async event => {
        event.preventDefault();
        updateDuration();
        updateTotalAmount();

        if (!form.reportValidity()) return;

        try {
            const result = await adminApiRequest("backend/api/reservations.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source: "dashboard",
                    guest: getElement("guestName").value.trim(),
                    email: getElement("adminGuestEmail").value.trim(),
                    phone: getElement("adminGuestPhone").value.trim(),
                    guests: Number(getElement("adminGuestCount").value),
                    channel: getElement("bookingChannel").value,
                    room: getElement("roomType").value.trim(),
                    rooms: Number(roomsInput.value),
                    checkInDate: arrivalDate.value,
                    checkOutDate: departureDate.value,
                    rate: Number(rateInput.value),
                    status: getElement("bookingStatus").value.toLowerCase()
                })
            });
            await refreshReservationsFromServer();
            alert(`Reservasi ${result.id} berhasil disimpan.`);
        } catch (error) {
            console.error("Failed to save reservation:", error);
            alert(error.message || "Reservasi gagal disimpan.");
            return;
        }

        form.reset();
        nightsInput.value = "";
        departureDate.min = "";
        getElement("reservationModal").classList.remove("active");
    });
}

function setupReservationDetails() {
    const resBody = getElement("allReservationsBody");
    const modal = getElement("reservationDetailsModal");
    const detailsBody = getElement("reservationDetailsBody");
    const form = getElement("reservationDetailsForm");
    const closeButton = getElement("btnCloseReservationDetails");
    const closeFooterButton = getElement("btnCloseReservationDetailsFooter");

    if (!resBody || !modal || !detailsBody || !form || !closeButton || !closeFooterButton) {
        return;
    }

    let activeReservationId = null;

    function closeModal() {
        modal.classList.remove("active");
        activeReservationId = null;
    }

    function showReservation(reservation) {
        const nights = Number(reservation.nights) || 0;
        const rooms = Number(reservation.rooms) || 1;
        const rate = reservation.rate ?? (nights > 0 ? reservation.price / (nights * rooms) : 0);
        const channels = [
            "Traveloka",
            "Tiket.com",
            "Agoda",
            "Booking.com",
            "Expedia",
            "Trip.com",
            "Direct Website"
        ];
        const channelOptions = channels.includes(reservation.channel)
            ? channels
            : [...channels, reservation.channel];
        activeReservationId = reservation.id;
        detailsBody.innerHTML = `
            <div class="reservation-detail-row"><strong>Booking ID</strong><span>${escapeHtml(reservation.id)}</span></div>
            <label for="editGuestEmail">Email</label>
            <input id="editGuestEmail" type="email" value="${escapeHtml(reservation.email || "")}" autocomplete="email">
            <label for="editGuestPhone">Nomor Telepon</label>
            <input id="editGuestPhone" type="tel" value="${escapeHtml(reservation.phone || "")}" autocomplete="tel">
            <label for="editGuestName">Atas Nama / Nama Tamu</label>
            <input id="editGuestName" type="text" value="${escapeHtml(reservation.guest)}" required>
            <label for="editGuestCount">Jumlah Tamu</label>
            <input id="editGuestCount" type="number" min="1" max="20" value="${Number(reservation.guests) || 1}" required>
            <label for="editBookingChannel">Channel Booking</label>
            <select id="editBookingChannel" required>
                ${channelOptions.map(channel => `<option value="${escapeHtml(channel)}"${channel === reservation.channel ? " selected" : ""}>${escapeHtml(channel)}</option>`).join("")}
            </select>
            <label for="editRoomType">Tipe Kamar</label>
            <select id="editRoomType" required>
                ${ROOM_TYPES.map(roomType => `<option value="${escapeHtml(roomType)}"${roomType === reservation.room ? " selected" : ""}>${escapeHtml(roomType)}</option>`).join("")}
            </select>
            <label for="editBookingRooms">Jumlah Kamar</label>
            <input id="editBookingRooms" type="number" min="1" value="${rooms}" required>
            <label for="editArrivalDate">Check-in</label>
            <input id="editArrivalDate" type="date" value="${escapeHtml(reservation.checkInDate || "")}" required>
            <label for="editDepartureDate">Check-out</label>
            <input id="editDepartureDate" type="date" value="${escapeHtml(reservation.departureDate || "")}" required>
            <label for="editBookingNights">Durasi Menginap (Malam)</label>
            <input id="editBookingNights" type="number" min="1" value="${nights || ""}" readonly required>
            <label for="editBookingRate">Tarif per Malam (IDR)</label>
            <input id="editBookingRate" type="number" min="0" value="${rate}" required>
            <label for="editBookingTotalAmount">Total Harga (IDR)</label>
            <input id="editBookingTotalAmount" type="number" min="0" value="${Number(reservation.price) || 0}" readonly required>
            <label for="editBookingStatus">Status Reservasi</label>
            <select id="editBookingStatus" required>
                <option value="confirmed"${reservation.status === "confirmed" ? " selected" : ""}>CONFIRMED</option>
                <option value="pending"${reservation.status === "pending" ? " selected" : ""}>PENDING</option>
                <option value="checked-in"${reservation.status === "checked-in" ? " selected" : ""}>CHECKED-IN</option>
                <option value="checked-out"${reservation.status === "checked-out" ? " selected" : ""}>CHECKED-OUT</option>
                <option value="cancelled"${reservation.status === "cancelled" ? " selected" : ""}>CANCELLED</option>
                <option value="no-show"${reservation.status === "no-show" ? " selected" : ""}>NO-SHOW</option>
            </select>
            <div class="reservation-detail-row"><strong>Tanggal Booking</strong><span>${escapeHtml(reservation.bookingDate || "-")}</span></div>
        `;

        const arrivalDate = getElement("editArrivalDate");
        const departureDate = getElement("editDepartureDate");
        const nightsInput = getElement("editBookingNights");
        const roomsInput = getElement("editBookingRooms");
        const rateInput = getElement("editBookingRate");
        const totalAmountInput = getElement("editBookingTotalAmount");

        function updateTotalAmount() {
            const stayNights = Number(nightsInput.value);
            const roomCount = Number(roomsInput.value);
            const nightlyRate = Number(rateInput.value);
            totalAmountInput.value = stayNights > 0 && roomCount > 0 && nightlyRate >= 0
                ? String(stayNights * roomCount * nightlyRate)
                : "";
        }

        function updateDuration() {
            departureDate.min = arrivalDate.value;
            departureDate.setCustomValidity("");

            if (!arrivalDate.value || !departureDate.value) {
                nightsInput.value = "";
                updateTotalAmount();
                return;
            }

            const arrivalUtc = Date.parse(`${arrivalDate.value}T00:00:00Z`);
            const departureUtc = Date.parse(`${departureDate.value}T00:00:00Z`);
            const stayNights = (departureUtc - arrivalUtc) / 86400000;

            if (stayNights < 1) {
                nightsInput.value = "";
                departureDate.setCustomValidity("Departure date must be after arrival date.");
            } else {
                nightsInput.value = stayNights;
            }

            updateTotalAmount();
        }

        arrivalDate.addEventListener("change", updateDuration);
        departureDate.addEventListener("change", updateDuration);
        roomsInput.addEventListener("input", updateTotalAmount);
        rateInput.addEventListener("input", updateTotalAmount);
        modal.classList.add("active");
        closeButton.focus();
    }

    resBody.addEventListener("click", event => {
        const button = event.target.closest(".btn-view-reservation");
        if (!button || !resBody.contains(button)) return;

        const reservation = bookingData.find(item => item.id === button.dataset.reservationId);
        if (reservation) {
            showReservation(reservation);
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const reservation = bookingData.find(item => item.id === activeReservationId);
        if (!reservation) return;

        const arrivalDate = getElement("editArrivalDate");
        const departureDate = getElement("editDepartureDate");
        const nightsInput = getElement("editBookingNights");
        const roomsInput = getElement("editBookingRooms");
        const rateInput = getElement("editBookingRate");
        const totalAmountInput = getElement("editBookingTotalAmount");
        departureDate.min = arrivalDate.value;

        if (arrivalDate.value && departureDate.value) {
            const arrivalUtc = Date.parse(`${arrivalDate.value}T00:00:00Z`);
            const departureUtc = Date.parse(`${departureDate.value}T00:00:00Z`);
            const stayNights = (departureUtc - arrivalUtc) / 86400000;
            departureDate.setCustomValidity(stayNights < 1
                ? "Departure date must be after arrival date."
                : "");
            if (stayNights > 0) nightsInput.value = stayNights;
            totalAmountInput.value = stayNights > 0
                ? String(stayNights * Number(roomsInput.value) * Number(rateInput.value))
                : "";
        }

        if (!form.reportValidity()) return;

        const channel = getElement("editBookingChannel").value;
        const channelClasses = {
            "Traveloka": "ota-traveloka",
            "Tiket.com": "ota-tiket",
            "Agoda": "ota-agoda",
            "Booking.com": "ota-booking",
            "Expedia": "ota-expedia",
            "Trip.com": "ota-trip",
            "Direct Website": "ota-website"
        };
        const previousReservation = { ...reservation };
        Object.assign(reservation, {
            guest: getElement("editGuestName").value.trim(),
            guests: Number(getElement("editGuestCount").value),
            email: getElement("editGuestEmail").value.trim(),
            phone: getElement("editGuestPhone").value.trim(),
            channel,
            otaClass: channelClasses[channel] || reservation.otaClass,
            room: getElement("editRoomType").value.trim(),
            rooms: Number(roomsInput.value),
            checkInDate: arrivalDate.value,
            departureDate: departureDate.value,
            nights: Number(nightsInput.value),
            rate: Number(rateInput.value),
            price: Number(totalAmountInput.value),
            status: getElement("editBookingStatus").value
        });

        try {
            await adminApiRequest("backend/api/reservations.php", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: reservation.id,
                    guest: reservation.guest,
                    guests: reservation.guests,
                    email: reservation.email,
                    phone: reservation.phone,
                    channel: reservation.channel,
                    room: reservation.room,
                    rooms: reservation.rooms,
                    checkInDate: reservation.checkInDate,
                    departureDate: reservation.departureDate,
                    rate: reservation.rate,
                    status: reservation.status
                })
            });
            await refreshReservationsFromServer();
        } catch (error) {
            Object.assign(reservation, previousReservation);
            console.error("Failed to update reservation:", error);
            alert(error.message || "Perubahan reservasi gagal disimpan.");
            return;
        }

        const updatedReservation = bookingData.find(item => item.id === activeReservationId);
        showReservation(updatedReservation || reservation);
    });

    closeButton.addEventListener("click", closeModal);
    closeFooterButton.addEventListener("click", closeModal);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });
}

const reservationModal = document.getElementById("reservationModal");
const btnAddReservation = document.getElementById("btnAddReservation");
const btnCloseReservation = document.getElementById("btnCloseReservation");
const btnCancelReservation = document.getElementById("btnCancelReservation");

if (btnAddReservation && reservationModal) {
    btnAddReservation.addEventListener("click", () => {
        reservationModal.classList.add("active");
    });
}

if (btnCloseReservation && reservationModal) {
    btnCloseReservation.addEventListener("click", () => {
        reservationModal.classList.remove("active");
    });
}

if (btnCancelReservation && reservationModal) {
    btnCancelReservation.addEventListener("click", () => {
        reservationModal.classList.remove("active");
    });
}
