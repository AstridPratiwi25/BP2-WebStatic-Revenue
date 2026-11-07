
// ==========================================
// VILLA & SANCTUARY BY ASTRID
// HOTEL REVENUE MANAGEMENT SYSTEM
// ==========================================


// 1. SIMULATION BOOKING DATA

const defaultBookingData = [
    {
        id: "BK-901",
        guest: "Budi Santoso",
        channel: "Traveloka",
        otaClass: "ota-traveloka",
        room: "Deluxe Double",
        nights: 3,
        price: 4500000,
        status: "confirmed",
        bookingDate: "2026-10-01",
        checkInDate: "2026-10-15"
    },
    {
        id: "BK-902",
        guest: "Siti Rahma",
        channel: "Tiket.com",
        otaClass: "ota-tiket",
        room: "Deluxe Double",
        nights: 2,
        price: 3200000,
        status: "confirmed",
        bookingDate: "2026-10-03",
        checkInDate: "2026-10-18"
    },
    {
        id: "BK-903",
        guest: "Michael Scott",
        channel: "Agoda",
        otaClass: "ota-agoda",
        room: "Superior Double",
        nights: 1,
        price: 1200000,
        status: "confirmed",
        bookingDate: "2026-10-05",
        checkInDate: "2026-10-20"
    },
    {
        id: "BK-904",
        guest: "Jessica Tan",
        channel: "Booking.com",
        otaClass: "ota-booking",
        room: "Executive Double",
        nights: 2,
        price: 5000000,
        status: "confirmed",
        bookingDate: "2026-10-10",
        checkInDate: "2026-10-22"
    },
    {
        id: "BK-905",
        guest: "Ahmad Dahlan",
        channel: "Expedia",
        otaClass: "ota-expedia",
        room: "Deluxe Double",
        nights: 2,
        price: 3000000,
        status: "cancelled",
        bookingDate: "2026-10-12",
        checkInDate: "2026-10-25"
    },
    {
        id: "BK-906",
        guest: "David Kim",
        channel: "Trip.com",
        otaClass: "ota-trip",
        room: "Superior Double",
        nights: 4,
        price: 4800000,
        status: "confirmed",
        bookingDate: "2026-10-15",
        checkInDate: "2026-11-02"
    },
    {
        id: "BK-907",
        guest: "Rina Wijaya",
        channel: "Direct Website",
        otaClass: "ota-website",
        room: "Junior Suite Double",
        nights: 2,
        price: 8500000,
        status: "confirmed",
        bookingDate: "2026-10-20",
        checkInDate: "2026-11-05"
    },
    {
        id: "BK-908",
        guest: "Eko Prasetyo",
        channel: "Traveloka",
        otaClass: "ota-traveloka",
        room: "Superior Double",
        nights: 1,
        price: 1200000,
        status: "pending",
        bookingDate: "2026-10-25",
        checkInDate: "2026-11-10"
    }
];


const STORAGE_KEY = "revenueTrackerBookings";
const ROOM_TYPES = [
    "Standard Twin",
    "Standard Double",
    "Superior Double",
    "Deluxe Double",
    "Executive Double",
    "Junior Suite Double"
];

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

function loadBookingData() {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
        let bookings;
        try {
            bookings = JSON.parse(savedData);
        } catch (error) {
            console.error("Failed to load saved bookings:", error);
        }

        if (Array.isArray(bookings)) {
            let bookingsUpdated = false;
            const normalizedBookings = bookings.map(booking => {
                const departureDate = getDepartureDate(booking.checkInDate, booking.nights);
                const room = normalizeRoomType(booking.room);
                const nextDepartureDate = departureDate || booking.departureDate;
                if (room === booking.room && nextDepartureDate === booking.departureDate) {
                    return booking;
                }

                bookingsUpdated = true;
                return { ...booking, room, departureDate: nextDepartureDate };
            });

            if (bookingsUpdated) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedBookings));
                } catch (error) {
                    console.error("Failed to save updated reservation dates and room types:", error);
                }
            }

            return normalizedBookings;
        }
    }

    return defaultBookingData.map(booking => {
        const departureDate = getDepartureDate(booking.checkInDate, booking.nights);
        return {
            ...booking,
            room: normalizeRoomType(booking.room),
            ...(departureDate ? { departureDate } : {})
        };
    });
}

let bookingData = loadBookingData();

function saveBookingData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(bookingData)
    );
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

        if (item.status !== "confirmed") return;

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
    if (typeof renderHotelFeatures === "function") renderHotelFeatures();
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

// Operational menu pages use the same local reservation data as the dashboard.
const HOTEL_FEATURES_KEY = "villaAstridFeatures";
const FEATURE_CHANNELS = ["Traveloka", "Tiket.com", "Agoda", "Booking.com", "Expedia", "Trip.com", "Direct Website"];

function featureState() {
    try { return JSON.parse(localStorage.getItem(HOTEL_FEATURES_KEY)) || {}; }
    catch (error) { return {}; }
}

function saveFeatureState(state) {
    localStorage.setItem(HOTEL_FEATURES_KEY, JSON.stringify(state));
}

function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function featureEmptyRow(columns, message = "Belum ada data.") {
    return `<tr><td colspan="${columns}" class="text-center text-muted py-3">${message}</td></tr>`;
}

function renderHotelFeatures() {
    const state = featureState();
    const confirmed = bookingData.filter(item => item.status === "confirmed");
    const arrivalsBody = getElement("arrivalsBody");
    const departuresBody = getElement("departuresBody");
    const today = localToday();
    const renderTurnover = (body, rows, actionLabel, actionStatus) => {
        if (!body) return;
        body.innerHTML = rows.length ? rows.map(item => `<tr><td><strong>${escapeHtml(item.guest)}</strong><div class="small text-muted">${escapeHtml(item.id)}</div></td><td>${escapeHtml(item.room)} Â· ${Number(item.rooms) || 1}</td><td><span class="badge bg-secondary">${escapeHtml(state.turnover?.[item.id] || "Belum diproses")}</span></td><td><button class="btn btn-sm btn-outline-primary" data-turnover="${escapeHtml(item.id)}" data-turnover-status="${actionStatus}">${actionLabel}</button></td></tr>`).join("") : featureEmptyRow(4, "Tidak ada jadwal untuk hari ini." );
    };
    renderTurnover(arrivalsBody, confirmed.filter(item => item.checkInDate === today), "Check-in", "Checked-in");
    renderTurnover(departuresBody, confirmed.filter(item => (item.departureDate || getDepartureDate(item.checkInDate, item.nights)) === today), "Check-out", "Checked-out");

    const guestSearch = getElement("guestSearch")?.value.trim().toLowerCase() || "";
    const guests = new Map();
    bookingData.forEach(item => {
        const key = item.guest.trim().toLowerCase();
        if (!key) return;
        const entry = guests.get(key) || { guest: item.guest, bookings: 0, channel: item.channel, spend: 0, lastDate: "" };
        entry.bookings++;
        entry.channel = item.channel;
        if (item.status === "confirmed") entry.spend += Number(item.price) || 0;
        entry.lastDate = [entry.lastDate, item.bookingDate || ""].sort().pop();
        guests.set(key, entry);
    });
    const guestRows = [...guests.values()].filter(g => `${g.guest} ${g.channel}`.toLowerCase().includes(guestSearch)).sort((a, b) => a.guest.localeCompare(b.guest));
    const guestBody = getElement("guestDirectoryBody");
    if (guestBody) guestBody.innerHTML = guestRows.length ? guestRows.map(g => `<tr><td><strong>${escapeHtml(g.guest)}</strong></td><td>${g.bookings} booking</td><td>${escapeHtml(g.channel)}</td><td>${escapeHtml(g.lastDate || "-")}</td><td>${formatRupiah(g.spend)}</td></tr>`).join("") : featureEmptyRow(5, "Tamu tidak ditemukan.");

    const inventory = state.inventory || [
        { number: "101", type: "Standard Twin", capacity: 2, status: "Aktif" },
        { number: "102", type: "Standard Double", capacity: 2, status: "Aktif" },
        { number: "201", type: "Superior Double", capacity: 2, status: "Aktif" },
        { number: "202", type: "Deluxe Double", capacity: 2, status: "Aktif" },
        { number: "301", type: "Executive Double", capacity: 3, status: "Aktif" },
        { number: "302", type: "Junior Suite Double", capacity: 3, status: "Aktif" }
    ];
    state.inventory = inventory;
    if (!featureState().inventory) saveFeatureState(state);
    const housekeepingBody = getElement("housekeepingBody");
    if (housekeepingBody) housekeepingBody.innerHTML = inventory.map(room => {
        const status = state.housekeeping?.[room.number] || "Bersih";
        return `<tr><td><strong>${escapeHtml(room.number)}</strong></td><td>${escapeHtml(room.type)}</td><td><select class="form-select form-select-sm housekeeping-status" data-room="${escapeHtml(room.number)}"><option${status === "Bersih" ? " selected" : ""}>Bersih</option><option${status === "Perlu dibersihkan" ? " selected" : ""}>Perlu dibersihkan</option><option${status === "Sedang dibersihkan" ? " selected" : ""}>Sedang dibersihkan</option><option${status === "Perlu diperiksa" ? " selected" : ""}>Perlu diperiksa</option></select></td><td><input class="form-control form-control-sm housekeeping-note" data-room="${escapeHtml(room.number)}" value="${escapeHtml(state.notes?.[room.number] || "")}" placeholder="Catatan"></td><td><span class="small text-muted">${escapeHtml(room.status)}</span></td></tr>`;
    }).join("");
    const inventoryBody = getElement("inventoryBody");
    if (inventoryBody) inventoryBody.innerHTML = inventory.map((room, index) => `<tr><td>${escapeHtml(room.number)}</td><td>${escapeHtml(room.type)}</td><td>${Number(room.capacity)} orang</td><td><select class="form-select form-select-sm inventory-status" data-index="${index}"><option${room.status === "Aktif" ? " selected" : ""}>Aktif</option><option${room.status === "Perbaikan" ? " selected" : ""}>Perbaikan</option><option${room.status === "Nonaktif" ? " selected" : ""}>Nonaktif</option></select></td><td><button class="btn btn-sm btn-outline-danger" data-remove-room="${index}">Hapus</button></td></tr>`).join("") || featureEmptyRow(5);

    const rates = state.rates || {};
    const ratesBody = getElement("ratesBody");
    const rateStats = {};
    confirmed.forEach(item => { const stats = rateStats[item.room] || { nights: 0, revenue: 0 }; stats.nights += (Number(item.nights) || 0) * (Number(item.rooms) || 1); stats.revenue += Number(item.price) || 0; rateStats[item.room] = stats; });
    if (ratesBody) ratesBody.innerHTML = ROOM_TYPES.map(type => `<tr><td>${escapeHtml(type)}</td><td><input class="form-control form-control-sm room-rate" data-type="${escapeHtml(type)}" type="number" min="0" step="10000" value="${Number(rates[type]) || 0}" placeholder="Atur tarif"></td><td>${rateStats[type]?.nights || 0}</td><td>${formatRupiah(rateStats[type]?.revenue || 0)}</td></tr>`).join("");

    const channelBody = getElement("channelManagerBody");
    if (channelBody) channelBody.innerHTML = FEATURE_CHANNELS.map(channel => {
        const count = bookingData.filter(item => item.channel === channel).length;
        return `<tr><td><strong>${escapeHtml(channel)}</strong></td><td><span class="badge bg-secondary">Demo Â· belum terhubung</span></td><td>${count} booking lokal</td><td>${escapeHtml(state.lastSync || "Belum pernah")}</td></tr>`;
    }).join("");

    const financeBody = getElement("financeBody");
    const commissionRate = Number(state.commission ?? 15);
    const revenue = confirmed.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    if (getElement("financeRevenue")) getElement("financeRevenue").textContent = formatRupiah(revenue);
    if (getElement("financeCommission")) getElement("financeCommission").textContent = formatRupiah(confirmed.filter(item => item.channel !== "Direct Website").reduce((sum, item) => sum + (Number(item.price) || 0), 0) * commissionRate / 100);
    if (getElement("financeNet")) getElement("financeNet").textContent = formatRupiah(revenue - confirmed.filter(item => item.channel !== "Direct Website").reduce((sum, item) => sum + (Number(item.price) || 0), 0) * commissionRate / 100);
    if (financeBody) financeBody.innerHTML = confirmed.length ? confirmed.map(item => `<tr><td>${escapeHtml(item.bookingDate || "-")}</td><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.guest)}</td><td>${escapeHtml(item.channel)}</td><td>${formatRupiah(item.price)}</td></tr>`).join("") : featureEmptyRow(5);

    const counters = { reportBookings: bookingData.length, reportConfirmed: confirmed.length, reportCancelled: bookingData.filter(item => item.status === "cancelled").length, reportRevenue: formatRupiah(revenue) };
    Object.entries(counters).forEach(([id, value]) => { if (getElement(id)) getElement(id).textContent = value; });

    const hotelName = getElement("hotelNameSetting");
    if (hotelName && document.activeElement !== hotelName) hotelName.value = state.hotelName || "Villa & Sanctuary by Astrid";
    const brandName = document.querySelector(".brand-title h5");
    if (brandName) brandName.textContent = state.hotelName || "Villa & Sanctuary by Astrid";
    const tax = getElement("taxSetting"); if (tax && document.activeElement !== tax) tax.value = state.tax ?? 11;
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
        const booking = bookingData.find(item => item.status === "confirmed" && item.room === room.type && date >= item.checkInDate && date < (item.departureDate || getDepartureDate(item.checkInDate, item.nights)));
        return `<td class="planner-day ${booking ? "bg-primary-subtle" : ""}" title="${booking ? escapeHtml(booking.guest) + " Â· " + escapeHtml(booking.id) : "Tersedia"}">${booking ? "â—" : ""}</td>`;
    }).join("")}</tr>`).join("");
}

function setupHotelFeatures() {
    renderHotelFeatures();
    getElement("guestSearch")?.addEventListener("input", renderHotelFeatures);
    getElement("plannerDate")?.addEventListener("change", () => renderPlanner(featureState().inventory || []));
    document.addEventListener("change", event => {
        const state = featureState();
        if (event.target.matches(".housekeeping-status")) { state.housekeeping = { ...state.housekeeping, [event.target.dataset.room]: event.target.value }; saveFeatureState(state); }
        if (event.target.matches(".housekeeping-note")) { state.notes = { ...state.notes, [event.target.dataset.room]: event.target.value }; saveFeatureState(state); }
        if (event.target.matches(".inventory-status")) { state.inventory = state.inventory || []; state.inventory[Number(event.target.dataset.index)].status = event.target.value; saveFeatureState(state); }
        if (event.target.matches(".room-rate")) { state.rates = { ...state.rates, [event.target.dataset.type]: Number(event.target.value) }; saveFeatureState(state); }
    });
    document.addEventListener("click", event => {
        const turnover = event.target.closest("[data-turnover]");
        if (turnover) { const state = featureState(); state.turnover = { ...state.turnover, [turnover.dataset.turnover]: turnover.dataset.turnoverStatus }; saveFeatureState(state); renderHotelFeatures(); }
        if (event.target.closest("#addInventoryRoom")) {
            const number = prompt("Nomor kamar baru:"); if (!number?.trim()) return;
            const state = featureState(); state.inventory = state.inventory || [];
            if (state.inventory.some(room => room.number === number.trim())) { alert("Nomor kamar sudah digunakan."); return; }
            const type = prompt(`Tipe kamar (${ROOM_TYPES.join(", ")}):`, ROOM_TYPES[0]); if (!type || !ROOM_TYPES.includes(type)) { alert("Pilih tipe kamar yang tersedia."); return; }
            state.inventory.push({ number: number.trim(), type, capacity: 2, status: "Aktif" }); saveFeatureState(state); renderHotelFeatures();
        }
        const remove = event.target.closest("[data-remove-room]");
        if (remove) { const state = featureState(); state.inventory.splice(Number(remove.dataset.removeRoom), 1); saveFeatureState(state); renderHotelFeatures(); }
        if (event.target.closest("#syncChannels")) { const state = featureState(); state.lastSync = new Date().toLocaleString("id-ID"); saveFeatureState(state); renderHotelFeatures(); if (getElement("syncMessage")) getElement("syncMessage").textContent = "Data lokal diperbarui; koneksi OTA langsung belum disiapkan."; }
        if (event.target.closest("#exportBookings")) exportReservationsCsv();
    });
    getElement("settingsForm")?.addEventListener("submit", event => {
        event.preventDefault(); const state = featureState(); state.hotelName = getElement("hotelNameSetting").value.trim(); state.tax = Number(getElement("taxSetting").value) || 0; state.commission = Number(getElement("commissionSetting").value) || 0; saveFeatureState(state);
        if (getElement("settingsMessage")) getElement("settingsMessage").textContent = "Pengaturan tersimpan.";
        renderHotelFeatures();
    });
    getElement("allReservationsBody")?.addEventListener("click", event => { if (event.target.closest(".btn-view-reservation")) setTimeout(renderHotelFeatures, 0); });
    window.addEventListener("storage", event => { if (event.key === STORAGE_KEY || event.key === HOTEL_FEATURES_KEY) renderHotelFeatures(); });
}

function exportReservationsCsv() {
    const columns = ["id", "guest", "channel", "room", "rooms", "checkInDate", "departureDate", "nights", "price", "status"];
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [columns.join(","), ...bookingData.map(item => columns.map(key => quote(item[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "reservations.csv"; link.click(); URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {

    // Initial dashboard rendering
    renderAllPages();
    setupHotelFeatures();

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
        btnRefresh.addEventListener("click", () => {
            alert(
                "Demo mode: Dashboard data has been refreshed. " +
                "Live OTA API integration is not connected yet."
            );

            renderAllPages();
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

    form.addEventListener("submit", event => {
        event.preventDefault();
        updateDuration();
        updateTotalAmount();

        if (!form.reportValidity()) return;

        const channel = getElement("bookingChannel").value;
        const channelClasses = {
            "Traveloka": "ota-traveloka",
            "Tiket.com": "ota-tiket",
            "Agoda": "ota-agoda",
            "Booking.com": "ota-booking",
            "Expedia": "ota-expedia",
            "Trip.com": "ota-trip",
            "Direct Website": "ota-website"
        };
        const nextId = bookingData.reduce((highestId, booking) => {
            const match = booking.id.match(/^BK-(\d+)$/);
            return match ? Math.max(highestId, Number(match[1])) : highestId;
        }, 0) + 1;
        const today = new Date();
        const bookingDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");
        const reservation = {
            id: `BK-${nextId}`,
            guest: getElement("guestName").value.trim(),
            channel,
            otaClass: channelClasses[channel],
            room: getElement("roomType").value.trim(),
            rooms: Number(roomsInput.value),
            nights: Number(nightsInput.value),
            rate: Number(rateInput.value),
            price: Number(totalAmountInput.value),
            status: getElement("bookingStatus").value.toLowerCase(),
            bookingDate,
            checkInDate: arrivalDate.value,
            departureDate: departureDate.value
        };

        bookingData.push(reservation);
        try {
            saveBookingData();
        } catch (error) {
            bookingData.pop();
            console.error("Failed to save reservation:", error);
            alert("Reservation could not be saved. Please check browser storage settings and try again.");
            return;
        }

        renderAllPages();
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
            <label for="editGuestName">Guest Name</label>
            <input id="editGuestName" type="text" value="${escapeHtml(reservation.guest)}" required>
            <label for="editBookingChannel">OTA Channel</label>
            <select id="editBookingChannel" required>
                ${channelOptions.map(channel => `<option value="${escapeHtml(channel)}"${channel === reservation.channel ? " selected" : ""}>${escapeHtml(channel)}</option>`).join("")}
            </select>
            <label for="editRoomType">Room Type</label>
            <select id="editRoomType" required>
                ${ROOM_TYPES.map(roomType => `<option value="${escapeHtml(roomType)}"${roomType === reservation.room ? " selected" : ""}>${escapeHtml(roomType)}</option>`).join("")}
            </select>
            <label for="editBookingRooms">Number of Rooms</label>
            <input id="editBookingRooms" type="number" min="1" value="${rooms}" required>
            <label for="editArrivalDate">Arrival Date</label>
            <input id="editArrivalDate" type="date" value="${escapeHtml(reservation.checkInDate || "")}" required>
            <label for="editDepartureDate">Departure Date</label>
            <input id="editDepartureDate" type="date" value="${escapeHtml(reservation.departureDate || "")}" required>
            <label for="editBookingNights">Duration (Nights)</label>
            <input id="editBookingNights" type="number" min="1" value="${nights || ""}" readonly required>
            <label for="editBookingRate">Rate per Night (IDR)</label>
            <input id="editBookingRate" type="number" min="0" value="${rate}" required>
            <label for="editBookingTotalAmount">Total Amount (IDR)</label>
            <input id="editBookingTotalAmount" type="number" min="0" value="${Number(reservation.price) || 0}" readonly required>
            <label for="editBookingStatus">Booking Status</label>
            <select id="editBookingStatus" required>
                <option value="confirmed"${reservation.status === "confirmed" ? " selected" : ""}>CONFIRMED</option>
                <option value="pending"${reservation.status === "pending" ? " selected" : ""}>PENDING</option>
                <option value="cancelled"${reservation.status === "cancelled" ? " selected" : ""}>CANCELLED</option>
            </select>
            <div class="reservation-detail-row"><strong>Booking Date</strong><span>${escapeHtml(reservation.bookingDate || "-")}</span></div>
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

    form.addEventListener("submit", event => {
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
            saveBookingData();
        } catch (error) {
            Object.assign(reservation, previousReservation);
            console.error("Failed to update reservation:", error);
            alert("Reservation changes could not be saved. Please check browser storage settings and try again.");
            return;
        }

        renderAllPages();
        showReservation(reservation);
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
