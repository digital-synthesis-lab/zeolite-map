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

    // Function to create links based on number of nearest neighbors
    function createLinks(numNeighbors) {
        const links = [];
        for (let i = 0; i < n; i++) {
            const distances = matrix[i].map((d, j) => ({index: j, distance: d}));
            distances.sort((a, b) => a.distance - b.distance);
            for (let k = 1; k <= numNeighbors && k < distances.length; k++) {
                if (distances[k].index > i) {
                    links.push({
                        source: i,
                        target: distances[k].index,
                        distance: distances[k].distance
                    });
                }
            }
        }
        return links;
    }

    // Set up the SVG
    const width = document.getElementById('visualization').clientWidth;
    const height = 600;
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add a background rect for better zoom/pan interaction
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    const g = svg.append("g")
        .attr("class", "zoom-container");

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed);

    svg.call(zoom);

    // Create initial force simulation
    let simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-30))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Initialize with 4 nearest neighbors
    let links = createLinks(4);
    let link = g.append("g")
        .attr("class", "links")
        .selectAll("line");

    // Calculate node size based on label length
    const getNodeSize = (label) => Math.max(20, label.length * 4);

    // Draw nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", d => getNodeSize(d.label) / 2)
        .attr("fill", "#69b3a2");

    // Add labels inside nodes
    const label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", d => Math.min(10, getNodeSize(d.label) / 3))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "white");

    // Update the graph
    function updateGraph(numNeighbors) {
        links = createLinks(numNeighbors);

        link = link.data(links, d => `${d.source.id}-${d.target.id}`);
        link.exit().remove();
        link = link.enter().append("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .merge(link);

        // Update forces
        simulation
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .alpha(1)
            .restart();
    }

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

    // Zoom function
    function zoomed(event) {
        g.attr("transform", event.transform);
    }

    // Handle neighbor selection
    d3.select("#neighbors").on("change", function() {
        const numNeighbors = parseInt(this.value);
        updateGraph(numNeighbors);
    });

    // Handle search
    d3.select("#search").on("input", function() {
        const searchTerms = this.value.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
        node.classed("highlighted", d => searchTerms.length > 0 && searchTerms.some(term => d.label.toLowerCase().includes(term)));
    });

    // Initial graph update
    updateGraph(4);
});
