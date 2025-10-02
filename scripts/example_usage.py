#!/usr/bin/env python3
"""
Example Usage Script for Background Removal

This script demonstrates how to use the remove_backgrounds.py script in different ways.
It shows both command-line usage examples and programmatic usage.
"""

import os
import subprocess
import sys
from pathlib import Path


def run_command(command: list[str]) -> bool:
    """
    Run a command and return True if successful, False otherwise.

    Args:
        command: List of command parts to run

    Returns:
        True if command was successful, False otherwise
    """
    try:
        print(f"Running: {' '.join(command)}")
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print("✓ Command completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Command failed: {e}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False


def demonstrate_cli_usage():
    """Demonstrate different command-line usage patterns."""
    print("=" * 60)
    print("COMMAND-LINE USAGE EXAMPLES")
    print("=" * 60)

    # Get the script path
    script_dir = Path(__file__).parent
    bg_remover_script = script_dir / "scripts" / "remove_backgrounds.py"

    print("\n1. Basic usage (default output folder and model):")
    print(f"   python {bg_remover_script} ./example_images")

    print("\n2. Custom output folder:")
    print(f"   python {bg_remover_script} ./example_images --output ./processed_images")

    print("\n3. Different rembg model:")
    print(f"   python {bg_remover_script} ./example_images --model u2net_human_seg")

    print("\n4. Full customization:")
    print(
        f"   python {bg_remover_script} ./example_images --output ./results --model isnet-general-use"
    )

    print("\n5. Help:")
    print(f"   python {bg_remover_script} --help")


def run_example_with_sample_images():
    """Run an actual example if sample images exist."""
    print("\n" + "=" * 60)
    print("RUNNING ACTUAL EXAMPLE")
    print("=" * 60)

    script_dir = Path(__file__).parent
    example_images_dir = script_dir / "example_images"
    bg_remover_script = script_dir / "scripts" / "remove_backgrounds.py"

    # Check if we have sample images
    if not example_images_dir.exists():
        print(f"Example images directory not found: {example_images_dir}")
        print("Please create the directory and add some sample images to test with.")
        return

    # Check for image files
    image_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}
    image_files = []
    for ext in image_extensions:
        image_files.extend(example_images_dir.glob(f"*{ext}"))
        image_files.extend(example_images_dir.glob(f"*{ext.upper()}"))

    if not image_files:
        print(f"No image files found in {example_images_dir}")
        print("Please add some sample images (PNG, JPG, etc.) to test with.")
        print("\nSupported formats: PNG, JPG, JPEG, WEBP, BMP, TIFF")
        return

    print(f"Found {len(image_files)} sample image(s)")
    for img in image_files:
        print(f"  - {img.name}")

    # Run the background removal
    command = [
        sys.executable,
        str(bg_remover_script),
        str(example_images_dir),
        "--output",
        str(script_dir / "example_images_no_bg"),
        "--model",
        "u2net",
    ]

    print(f"\nRunning background removal...")
    success = run_command(command)

    if success:
        output_dir = script_dir / "example_images_no_bg"
        if output_dir.exists():
            processed_files = list(output_dir.glob("*.png"))
            print(f"\n✓ Successfully processed {len(processed_files)} image(s)")
            print(f"Results saved in: {output_dir}")
            for file in processed_files:
                print(f"  - {file.name}")
        else:
            print("Output directory not found - something went wrong.")
    else:
        print("Background removal failed. Check the error messages above.")


def programmatic_usage_example():
    """Show how to use the background removal functionality programmatically."""
    print("\n" + "=" * 60)
    print("PROGRAMMATIC USAGE EXAMPLE")
    print("=" * 60)

    print("""
If you want to use the background removal functionality in your own Python code,
you can import and use the functions directly:

```python
from pathlib import Path
from scripts.remove_backgrounds import process_images

# Process images programmatically
input_folder = Path('./my_images')
output_folder = Path('./processed_images')
model = 'u2net_human_seg'  # Choose your model

# This will process all images in input_folder
process_images(input_folder, output_folder, model)
```

Available models:
- u2net: General purpose (default)
- u2net_human_seg: Optimized for humans
- u2net_cloth_seg: Optimized for clothing
- isnet-general-use: High quality general purpose
- silueta: Fast processing
- and more...
""")


def setup_instructions():
    """Provide setup instructions."""
    print("\n" + "=" * 60)
    print("SETUP INSTRUCTIONS")
    print("=" * 60)

    print("""
To use this background removal script:

1. Make sure you're in the python-version directory
2. The rembg package should already be installed via UV
3. Add some sample images to the example_images folder
4. Run the script with your desired options

Sample images you can use for testing:
- Photos of people (works well with u2net_human_seg model)
- Product photos (works well with u2net model)
- Any images with clear subjects and backgrounds

The script will:
- Automatically detect supported image formats
- Remove backgrounds and make them transparent
- Save results as PNG files (to preserve transparency)
- Show a progress bar during processing
""")


def main():
    """Main function to run all examples and demonstrations."""
    print("BACKGROUND REMOVAL SCRIPT - USAGE EXAMPLES")
    print("==========================================")

    # Show CLI examples
    demonstrate_cli_usage()

    # Show programmatic usage
    programmatic_usage_example()

    # Show setup instructions
    setup_instructions()

    # Try to run actual example
    run_example_with_sample_images()

    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)
    print(
        "Check out the remove_backgrounds.py script in the scripts folder for more details."
    )


if __name__ == "__main__":
    main()
