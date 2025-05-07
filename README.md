# CCU Part Time / Rent Map Project

This repository contains the code for the CCU Part Time / Rent Map project.

## Guidelines for Coding

These guidelines are crucial for the coding agent (referred to as 'Claude' or 'the agent') to follow to ensure code stability and prevent unintended modifications.

**Please follow these rules strictly when performing tasks:**

1.  **Confine Changes to Task Scope:** When tasked with generating, modifying, or fixing code (function, style, bug fix, feature addition, etc.), **strictly limit modifications** to only the code directly relevant to that specific task. **DO NOT alter unrelated files, functions, CSS rules, HTML elements, or any code segments outside the immediate scope of the request.** Focus precisely on the code area being addressed.

2.  **GeoJSON Data is Immutable:** The content (data points, property values, coordinates) within GeoJSON files (e.g., `src/data/establishments.geojson` and any future rent data GeoJSON) is **OFF LIMITS for modification**. You may be asked to add functions or attributes that *process* this data, but you **must not change, add, or remove the data points or their existing property values** within the GeoJSON files themselves. Treat the GeoJSON content as read-only data, unless otherwise instructed.

3.  **Respect Existing HTML Structure and Identifiers:** The HTML files (like `index.html`, `job/jobmap.html`, `job/jobabout.html`) have an established structure. **Do not arbitrarily change existing HTML element IDs or classes** that are currently used by JavaScript or CSS, unless the task explicitly involves refactoring these identifiers. Add new HTML elements or attributes for new features cleanly using clear naming.