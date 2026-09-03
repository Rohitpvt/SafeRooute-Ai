import os
import pytest
import pandas as pd
from ml.train import generate_synthetic_data
from ml.retrain import retrain_model, evaluate_and_promote

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_retraining_pipeline_promotion(tmp_path):
    # Backup active model_metadata.json
    prod_meta_path = os.path.join("ml", "model_metadata.json")
    meta_backup = None
    if os.path.exists(prod_meta_path):
        with open(prod_meta_path) as f:
            meta_backup = f.read()

    try:
        # 1. Create a valid 100-row synthetic dataset in uploads/
        uploads_dir = os.path.join("uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        valid_df = generate_synthetic_data(100)
        valid_csv_path = os.path.join(uploads_dir, "test_retrain_valid.csv")
        valid_df.to_csv(valid_csv_path, index=False)

        # 2. Run retraining on valid dataset
        cand_meta = retrain_model("test_retrain_valid.csv")
        
        assert "model_version" in cand_meta
        assert "evaluation_metrics" in cand_meta
        
        candidate_version = cand_meta["model_version"]
        candidate_meta_file = os.path.join("ml", f"candidate_metadata_v{candidate_version}.json")
        assert os.path.exists(candidate_meta_file)

        # 3. Promote candidate model to production
        promotion_res = evaluate_and_promote(candidate_version)
        assert promotion_res["success"] is True
        assert promotion_res["promoted_version"] == candidate_version

    finally:
        # Cleanup candidate metadata file and test upload file
        if 'candidate_meta_file' in locals() and os.path.exists(candidate_meta_file):
            os.remove(candidate_meta_file)
        if 'valid_csv_path' in locals() and os.path.exists(valid_csv_path):
            os.remove(valid_csv_path)
        if meta_backup is not None:
            with open(prod_meta_path, "w") as f:
                f.write(meta_backup)
            # Re-initialize model_manager in memory
            from ml.model_manager import model_manager
            model_manager.load_artifacts()

