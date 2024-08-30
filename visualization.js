// Load the CSV file
d3.csv("https://raw.githubusercontent.com/dskoda/Zeolites-AMD/main/data/iza_dm.csv").then(function(data) {
    // Get labels from the first column
    const labels = data.map(row => row[Object.keys(row)[0]]);

    // Parse the CSV data into a distance matrix
    const matrix = data.map(row => {
        const values = Object.values(row);
        return values.slice(1).map(Number);  // Exclude the first column (label)
    });

    const n = matrix.length;

    // Create nodes with labels
    const nodes = labels.map((label, i) => ({id: i, label: label}));

    // Find 4 nearest neighbors for each node
    const links = [];
    for (let i = 0; i < n; i++) {
        const distances = matrix[i].map((d, j) => ({index: j, distance: d}));
        distances.sort((a, b) => a.distance - b.distance);
        for (let k = 1; k <= 4 && k < distances.length; k++) {
            if (distances[k].index > i) {
                links.push({
                    source: i,
                    target: distances[k].index,
                    distance: distances[k].distance
                });
            }
        }
    }

    // Set up the SVG
    const width = 800;
    const height = 600;
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a force simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.distance * 10))
        .force("charge", d3.forceManyBody().strength(-30))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);

    // Draw nodes
    const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 5)
        .attr("fill", "#69b3a2");

    // Add labels
    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", 10)
        .attr("dx", 8)
        .attr("dy", 3);

    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });
});
