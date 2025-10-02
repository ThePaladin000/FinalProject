import React from "react";
import PropTypes from "prop-types";

/**
 * A pure functional loading spinner component.
 * The animation is defined within the component for full encapsulation.
 */
const LoadingSpinner = ({ size, color, thickness }) => {
  // Define styles as objects to be used inline.
  // This makes it easy to apply props directly to the styles.
  const spinnerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: `${thickness}px solid rgba(0, 0, 0, 0.1)`,
    // The main color is applied to the top border to create the arc effect
    borderTopColor: color,
    borderRadius: "50%",
    animation: "spinner-spin 1s linear infinite",
  };

  // The @keyframes for the rotation animation.
  // Injecting a <style> tag is a straightforward way to define
  // keyframes within a self-contained component without needing a separate CSS file.
  const keyframes = `
    @keyframes spinner-spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={spinnerStyle} aria-label="Loading" role="status"></div>
    </>
  );
};

// Define prop types for type checking and documentation.
LoadingSpinner.propTypes = {
  /** The size (width and height) of the spinner in pixels. */
  size: PropTypes.number,
  /** The color of the spinner's animated arc. */
  color: PropTypes.string,
  /** The thickness of the spinner's border in pixels. */
  thickness: PropTypes.number,
};

// Set default values for the props.
LoadingSpinner.defaultProps = {
  size: 40,
  color: "#9810FA", // The requested color
  thickness: 4,
};

export default LoadingSpinner;
