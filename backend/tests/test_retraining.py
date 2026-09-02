import os
import pytest
from ml.retrain import retrain_model, evaluate_and_promote

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_retraining_pipeline_promotion():
    # 1. Run retraining (using synthetic data fallback since no uploads are in test environment)
    cand_meta = retrain_model()
    
    assert "model_version" in cand_meta
    assert "evaluation_metrics" in cand_meta
    
    candidate_version = cand_meta["model_version"]
    candidate_meta_file = os.path.join("ml", f"candidate_metadata_v{candidate_version}.json")
    assert os.path.exists(candidate_meta_file)

    # 2. Promote candidate model to production
    # Verify F1 score comparisons rules
    promotion_res = evaluate_and_promote(candidate_version)
    assert promotion_res["success"] is True
    assert promotion_res["promoted_version"] == candidate_version

    # Cleanup candidate metadata file if left behind
    if os.path.exists(candidate_meta_file):
        os.remove(candidate_meta_file)
