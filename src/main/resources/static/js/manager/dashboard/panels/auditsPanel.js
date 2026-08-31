(() => {
    function create({ root }) {
        if (!root) throw new Error("Audits panel root is required.");
        return Object.freeze({ activate() {} });
    }

    window.OmagotchiDashboardPanels.register({
        key: "audits",
        route: "audits",
        label: "작업 이력",
        order: 90,
        topics: [],
        create
    });
})();
