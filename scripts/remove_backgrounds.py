#!/usr/bin/env python3
"""
Background Removal Script using rembg

This script removes backgrounds from all images in a specified folder using the rembg library.
It supports common image formats (PNG, JPG, JPEG, WEBP, BMP, TIFF) and saves the processed
images with transparent backgrounds to an output directory.

Usage:
    python remove_backgrounds.py input_folder [--output output_folder] [--model model_name]

Examples:
    python remove_backgrounds.py ./images
    python remove_backgrounds.py ./images --output ./processed_images
    python remove_backgrounds.py ./images --model u2net --output ./results
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Optional

from PIL import Image
from tqdm import tqdm


# Supported image formats
SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}


def get_image_files(folder_path: Path) -> List[Path]:
    """
    Get all supported image files from the specified folder.

    Args:
        folder_path: Path to the folder containing images

    Returns:
        List of Path objects for supported image files
    """
    image_files = []

    if not folder_path.exists():
        raise FileNotFoundError(f"Input folder does not exist: {folder_path}")

    if not folder_path.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")

    for file_path in folder_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_FORMATS:
            image_files.append(file_path)

    return sorted(image_files)


def remove_background(input_path: Path, output_path: Path, session) -> bool:
    """
    Remove background from a single image.

    Args:
        input_path: Path to input image
        output_path: Path to save processed image
        session: rembg session for background removal

    Returns:
        True if successful, False otherwise
    """
    try:
        # Import rembg only when needed
        from rembg import remove

        # Open the input image
        with open(input_path, "rb") as input_file:
            input_data = input_file.read()

        # Remove background
        output_data = remove(input_data, session=session)

        # Save the result
        with open(output_path, "wb") as output_file:
            output_file.write(output_data)

        return True

    except Exception as e:
        print(f"Error processing {input_path.name}: {str(e)}")
        return False


def process_images(
    input_folder: Path, output_folder: Path, model: str = "u2net"
) -> None:
    """
    Process all images in the input folder and save results to output folder.

    Args:
        input_folder: Path to folder containing input images
        output_folder: Path to folder for processed images
        model: rembg model to use for background removal
    """
    # Get list of image files
    print(f"Scanning for images in: {input_folder}")
    image_files = get_image_files(input_folder)

    if not image_files:
        print("No supported image files found in the input folder.")
        print(f"Supported formats: {', '.join(SUPPORTED_FORMATS)}")
        return

    print(f"Found {len(image_files)} image(s) to process")

    # Create output directory if it doesn't exist
    output_folder.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_folder}")

    # Initialize rembg session with specified model
    print(f"Initializing rembg with model: {model}")
    try:
        # Import rembg only when needed
        from rembg import new_session

        session = new_session(model)
    except Exception as e:
        print(f"Error initializing rembg session: {str(e)}")
        print(
            "Available models: u2net, u2net_human_seg, u2net_cloth_seg, isnet-general-use, etc."
        )
        return

    # Process images
    successful = 0
    failed = 0

    print("Processing images...")
    for image_file in tqdm(image_files, desc="Removing backgrounds"):
        # Generate output filename (ensure .png extension for transparency)
        output_name = image_file.stem + ".png"
        output_path = output_folder / output_name

        # Process the image
        if remove_background(image_file, output_path, session):
            successful += 1
        else:
            failed += 1

    # Summary
    print(f"\nProcessing complete!")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total: {len(image_files)}")

    if successful > 0:
        print(f"Processed images saved to: {output_folder}")


def main():
    """Main function to handle command line arguments and run the script."""
    parser = argparse.ArgumentParser(
        description="Remove backgrounds from images using rembg",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python remove_backgrounds.py ./images
  python remove_backgrounds.py ./images --output ./processed
  python remove_backgrounds.py ./images --model u2net_human_seg --output ./results

Supported image formats: PNG, JPG, JPEG, WEBP, BMP, TIFF
Output images are saved as PNG files with transparent backgrounds.

Popular rembg models:
  - u2net (default): General purpose background removal
  - u2net_human_seg: Optimized for human subjects
  - u2net_cloth_seg: Optimized for clothing
  - isnet-general-use: High quality general purpose model
        """,
    )

    parser.add_argument(
        "input_folder", type=str, help="Path to folder containing input images"
    )

    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default=None,
        help='Output folder for processed images (default: input_folder + "_no_bg")',
    )

    parser.add_argument(
        "--model",
        "-m",
        type=str,
        default="u2net",
        help="rembg model to use (default: u2net)",
    )

    args = parser.parse_args()

    # Convert input folder to Path object
    input_folder = Path(args.input_folder).resolve()

    # Determine output folder
    if args.output:
        output_folder = Path(args.output).resolve()
    else:
        output_folder = input_folder.parent / (input_folder.name + "_no_bg")

    # Validate input
    if not input_folder.exists():
        print(f"Error: Input folder does not exist: {input_folder}")
        sys.exit(1)

    if not input_folder.is_dir():
        print(f"Error: Input path is not a directory: {input_folder}")
        sys.exit(1)

    # Run the processing
    try:
        process_images(input_folder, output_folder, args.model)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
