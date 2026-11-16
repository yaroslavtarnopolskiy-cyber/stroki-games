using UnityEngine;

[System.Serializable]
public class Choice
{
    public string label;
    public int scale;
    public string consequence;
    public bool Exists => !string.IsNullOrWhiteSpace(label);
}

[System.Serializable]
public class CardData
{
    public int choice_number;
    public string cardName;
    [TextArea] public string text;
    public string portraitName;
    public Sprite portrait;
    public Choice left = new Choice();
    public Choice right = new Choice();
    public string type = "";
    public string url = "";
    public string musicName;
    public AudioClip music;
}