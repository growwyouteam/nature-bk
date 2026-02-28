const SiteSetting = require('../models/SiteSetting');

// @desc    Get a site setting by key
// @route   GET /api/settings/:key
// @access  Public
exports.getSettingByKey = async (req, res) => {
    try {
        const setting = await SiteSetting.findOne({ key: req.params.key });
        if (!setting) {
            return res.status(404).json({ msg: 'Setting not found' });
        }
        res.json(setting);
    } catch (error) {
        console.error("Error fetching setting:", error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// @desc    Update or create a site setting
// @route   POST /api/settings
// @access  Private/Admin
exports.updateSetting = async (req, res) => {
    try {
        const { key, value, description } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ msg: 'Key and value are required' });
        }

        let setting = await SiteSetting.findOne({ key });

        if (setting) {
            setting.value = value;
            if (description !== undefined) {
                setting.description = description;
            }
            await setting.save();
        } else {
            setting = await SiteSetting.create({
                key,
                value,
                description
            });
        }

        res.json(setting);
    } catch (error) {
        console.error("Error updating setting:", error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};
